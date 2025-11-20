# app/services/puppeteer_pdf_service.py

import asyncio
import subprocess
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from jinja2 import Environment, FileSystemLoader

class PuppeteerPDFService:
    """Service for generating high-quality PDF schedules using Puppeteer"""

    def __init__(self):
        self.upload_dir = Path("uploads/schedules")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        # Setup Jinja2 for HTML templates
        template_dir = Path(__file__).parent.parent / "templates"
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))

        # Path to the Node.js PDF generator script
        self.pdf_generator_script = Path(__file__).parent.parent.parent / "scripts" / "generate_pdf.js"

    async def generate_schedule_pdf(
        self,
        schedule,
        assignments: List[Dict],
        staff: List[Dict],
        facility: Dict,
        shifts: List[Dict],
        zones: List[Dict],
        pdf_type: str = "full"
    ) -> bytes:
        """
        Generate a PDF schedule using Puppeteer

        Args:
            schedule: Schedule object or dict
            assignments: List of assignment dicts
            staff: List of staff dicts
            facility: Facility dict
            shifts: List of facility shift dicts
            zones: List of facility zone dicts
            pdf_type: Type of PDF ("full", "individual", or "summary")

        Returns:
            bytes: PDF file content
        """
        try:
            # Normalize schedule data
            if isinstance(schedule, dict):
                schedule_dict = schedule
            else:
                schedule_dict = {
                    'week_start': getattr(schedule, 'week_start', None),
                    'id': getattr(schedule, 'id', 'unknown'),
                    'facility_id': getattr(schedule, 'facility_id', 'unknown')
                }

            # Parse week_start
            week_start = self._parse_date(schedule_dict.get('week_start'))

            # Prepare template data
            template_data = self._prepare_template_data(
                schedule_dict, assignments, staff, facility, shifts, zones, week_start
            )

            # Render HTML
            html_content = self._render_html_template(template_data)

            # Generate PDF using Puppeteer
            pdf_data = await self._generate_pdf_from_html(html_content)

            return pdf_data

        except Exception as e:
            print(f"❌ PDF generation error: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"PDF generation failed: {str(e)}")

    def _parse_date(self, date_input) -> datetime:
        """Parse various date formats to datetime"""
        if isinstance(date_input, str):
            return datetime.fromisoformat(date_input.split('T')[0])
        elif isinstance(date_input, datetime):
            return date_input
        elif hasattr(date_input, 'date'):
            return datetime.combine(date_input, datetime.min.time())
        else:
            return datetime.now()

    def _prepare_template_data(
        self,
        schedule: Dict,
        assignments: List[Dict],
        staff: List[Dict],
        facility: Dict,
        shifts: List[Dict],
        zones: List[Dict],
        week_start: datetime
    ) -> Dict[str, Any]:
        """Prepare data for the HTML template"""

        # Calculate week dates
        week_dates = [week_start + timedelta(days=i) for i in range(7)]
        date_headers = [
            date.strftime('%a, %b %d') for date in week_dates
        ]

        # Create lookups
        shift_lookup = {
            shift.get('shift_index', shift.get('shift_order', i)): shift
            for i, shift in enumerate(shifts)
        }
        zone_lookup = {
            zone.get('id', zone.get('zone_id')): zone
            for zone in zones
        }

        # Organize assignments by staff and day
        assignments_by_staff = {}
        for assignment in assignments:
            staff_id = str(assignment.get('staff_id'))
            day = int(assignment.get('day', 0))
            shift_index = int(assignment.get('shift', 0))
            zone_id = assignment.get('zone_id')

            if staff_id not in assignments_by_staff:
                assignments_by_staff[staff_id] = {}
            if day not in assignments_by_staff[staff_id]:
                assignments_by_staff[staff_id][day] = []

            # Get shift info
            shift_info = shift_lookup.get(shift_index, {})
            shift_name = shift_info.get('shift_name', shift_info.get('name', f'Shift {shift_index + 1}'))
            start_time = shift_info.get('start_time', '')
            end_time = shift_info.get('end_time', '')

            if start_time and end_time:
                shift_display = f"{shift_name} ({start_time}-{end_time})"
            else:
                shift_display = shift_name

            # Get zone info
            zone_name = None
            if zone_id:
                zone_info = zone_lookup.get(zone_id)
                if zone_info:
                    zone_name = zone_info.get('zone_name', zone_info.get('name'))

            assignments_by_staff[staff_id][day].append({
                'shift_name': shift_display,
                'zone_name': zone_name
            })

        # Normalize staff data
        normalized_staff = []
        for staff_member in staff:
            if isinstance(staff_member, dict):
                normalized_staff.append({
                    'id': str(staff_member.get('id')),
                    'full_name': staff_member.get('full_name', staff_member.get('name', 'Unknown'))
                })
            else:
                normalized_staff.append({
                    'id': str(getattr(staff_member, 'id')),
                    'full_name': getattr(staff_member, 'full_name', 'Unknown')
                })

        week_end = week_start + timedelta(days=6)

        return {
            'facility_name': facility.get('name', 'Facility'),
            'week_start_formatted': week_start.strftime('%b %d'),
            'week_end_formatted': week_end.strftime('%b %d, %Y'),
            'generated_date': datetime.now().strftime('%B %d, %Y at %I:%M %p'),
            'date_headers': date_headers,
            'staff_list': normalized_staff,
            'assignments_by_staff': assignments_by_staff
        }

    def _render_html_template(self, template_data: Dict[str, Any]) -> str:
        """Render the HTML template with data"""
        template = self.jinja_env.get_template('schedule_pdf.html')
        return template.render(**template_data)

    async def _generate_pdf_from_html(self, html_content: str) -> bytes:
        """Generate PDF from HTML using Puppeteer via Node.js script"""

        # Create a temporary HTML file
        temp_html_path = self.upload_dir / f"temp_{datetime.now().timestamp()}.html"
        temp_pdf_path = self.upload_dir / f"temp_{datetime.now().timestamp()}.pdf"

        try:
            # Write HTML to temp file
            with open(temp_html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)

            # Call Node.js script to generate PDF
            # We'll create this script next
            process = await asyncio.create_subprocess_exec(
                'node',
                str(self.pdf_generator_script),
                str(temp_html_path),
                str(temp_pdf_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                raise Exception(f"Puppeteer PDF generation failed: {error_msg}")

            # Read the generated PDF
            with open(temp_pdf_path, 'rb') as f:
                pdf_data = f.read()

            return pdf_data

        finally:
            # Clean up temp files
            if temp_html_path.exists():
                temp_html_path.unlink()
            if temp_pdf_path.exists():
                temp_pdf_path.unlink()

    async def save_pdf(self, pdf_data: bytes, filename: str) -> str:
        """
        Save PDF data to file and return URL

        Args:
            pdf_data: PDF file content as bytes
            filename: Desired filename

        Returns:
            str: URL where PDF can be accessed
        """
        # Ensure filename is unique
        if not filename.endswith('.pdf'):
            filename += '.pdf'

        # Add timestamp to prevent conflicts
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name_parts = filename.rsplit('.', 1)
        unique_filename = f"{name_parts[0]}_{timestamp}.{name_parts[1]}"

        file_path = self.upload_dir / unique_filename

        # Save file
        with open(file_path, 'wb') as f:
            f.write(pdf_data)

        # Return URL (adjust based on your file serving setup)
        return f"/uploads/schedules/{unique_filename}"

    async def generate_staff_individual_pdfs(
        self,
        schedule,
        assignments: List[Dict],
        staff: List[Dict],
        facility: Dict,
        shifts: List[Dict],
        zones: List[Dict]
    ) -> Dict[str, str]:
        """
        Generate individual PDF for each staff member

        Returns:
            Dict mapping staff_id to PDF URL
        """
        staff_pdfs = {}

        for staff_member in staff:
            staff_id = str(staff_member.get('id') if isinstance(staff_member, dict) else staff_member.id)
            staff_name = staff_member.get('full_name', 'staff') if isinstance(staff_member, dict) else staff_member.full_name

            # Filter assignments for this staff member
            staff_assignments = [a for a in assignments if str(a.get('staff_id')) == staff_id]

            if staff_assignments:  # Only generate PDF if staff has assignments
                pdf_data = await self.generate_schedule_pdf(
                    schedule,
                    staff_assignments,
                    [staff_member],
                    facility,
                    shifts,
                    zones,
                    pdf_type="individual"
                )

                week_start = schedule.week_start if hasattr(schedule, 'week_start') else schedule.get('week_start')
                filename = f"schedule_{staff_name.replace(' ', '_')}_{week_start}"
                pdf_url = await self.save_pdf(pdf_data, filename)
                staff_pdfs[staff_id] = pdf_url

        return staff_pdfs
