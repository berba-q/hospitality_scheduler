# app/services/pdf_service.py

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import uuid
from pathlib import Path

class PDFService:
    """Service for generating PDF schedules with professional layouts"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
        
        # Ensure upload directory exists
        self.upload_dir = Path("uploads/schedules")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles for better formatting"""
        
        # Title style
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1f2937'),  # Gray-800
            alignment=TA_CENTER,
            spaceAfter=20,
            fontName='Helvetica-Bold'
        )
        
        # Subtitle style
        self.subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#374151'),  # Gray-700
            alignment=TA_CENTER,
            spaceAfter=12,
            fontName='Helvetica'
        )
        
        # Header info style
        self.header_info_style = ParagraphStyle(
            'HeaderInfo',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6b7280'),  # Gray-500
            alignment=TA_CENTER,
            spaceAfter=6
        )
        
        # Footer style
        self.footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#9ca3af'),  # Gray-400
            alignment=TA_CENTER
        )
        
        # Staff name style (for individual schedules)
        self.staff_name_style = ParagraphStyle(
            'StaffName',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#1f2937'),
            fontName='Helvetica-Bold',
            spaceAfter=6
        )
    
    async def generate_schedule_pdf(
        self, 
        schedule, 
        assignments: List[Dict], 
        staff: List[Dict], 
        facility: Dict,
        pdf_type: str = "full"  # "full", "individual", or "summary"
    ) -> bytes:
        """
        Generate a PDF schedule
        
        Args:
            schedule: Schedule object with basic info
            assignments: List of assignment dictionaries
            staff: List of staff member dictionaries  
            facility: Facility dictionary with name, zones, shifts
            pdf_type: Type of PDF to generate
        
        Returns:
            bytes: PDF file content
        """
        buffer = BytesIO()
        
        # Use A4 for better international compatibility
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            topMargin=0.75*inch,
            bottomMargin=0.75*inch,
            leftMargin=0.75*inch,
            rightMargin=0.75*inch
        )
        
        # Build content based on PDF type
        if pdf_type == "individual":
            content = self._build_individual_schedule_content(schedule, assignments, staff, facility)
        elif pdf_type == "summary":
            content = self._build_summary_content(schedule, assignments, staff, facility)
        else:  # full
            content = self._build_full_schedule_content(schedule, assignments, staff, facility)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _build_full_schedule_content(self, schedule, assignments, staff, facility):
        """Build content for full schedule PDF"""
        content = []
        
        # Header
        content.extend(self._build_header(schedule, facility))
        content.append(Spacer(1, 0.3*inch))
        
        # Schedule overview
        content.extend(self._build_schedule_overview(assignments, staff))
        content.append(Spacer(1, 0.2*inch))
        
        # Main schedule table
        schedule_table = self._build_schedule_table(assignments, staff, facility)
        content.append(schedule_table)
        content.append(Spacer(1, 0.3*inch))
        
        # Staff summary
        content.extend(self._build_staff_summary(assignments, staff))
        content.append(Spacer(1, 0.2*inch))
        
        # Footer
        content.extend(self._build_footer())
        
        return content
    
    def _build_individual_schedule_content(self, schedule, assignments, staff, facility):
        """Build content for individual staff schedule PDF"""
        content = []
        
        # Group assignments by staff member
        staff_assignments = {}
        for assignment in assignments:
            staff_id = assignment.get('staff_id')
            if staff_id not in staff_assignments:
                staff_assignments[staff_id] = []
            staff_assignments[staff_id].append(assignment)
        
        # Create a page for each staff member
        for staff_id, staff_member in enumerate(staff):
            if staff_id > 0:  # Add page break between staff
                content.append(Spacer(1, 8*inch))  # Force new page
            
            # Staff header
            content.extend(self._build_header(schedule, facility, staff_member.get('full_name')))
            content.append(Spacer(1, 0.2*inch))
            
            # Individual schedule table
            staff_schedule_assignments = staff_assignments.get(staff_member.get('id'), [])
            individual_table = self._build_individual_schedule_table(staff_schedule_assignments, facility)
            content.append(individual_table)
            content.append(Spacer(1, 0.2*inch))
            
            # Weekly summary for this staff member
            content.extend(self._build_individual_summary(staff_schedule_assignments, facility))
        
        # Footer
        content.extend(self._build_footer())
        
        return content
    
    def _build_summary_content(self, schedule, assignments, staff, facility):
        """Build content for summary PDF"""
        content = []
        
        # Header
        content.extend(self._build_header(schedule, facility, "Schedule Summary"))
        content.append(Spacer(1, 0.3*inch))
        
        # Key metrics
        content.extend(self._build_schedule_metrics(assignments, staff, facility))
        content.append(Spacer(1, 0.2*inch))
        
        # Staff summary table
        content.append(self._build_staff_summary_table(assignments, staff))
        content.append(Spacer(1, 0.2*inch))
        
        # Footer
        content.extend(self._build_footer())
        
        return content
    
    def _build_header(self, schedule, facility, subtitle: Optional[str] = None):
        """Build PDF header with facility and schedule info"""
        content = []
        
        # Main title
        facility_name = getattr(facility, 'name', 'Facility')
        title_text = f"{facility_name}<br/>Weekly Schedule"
        title = Paragraph(title_text, self.title_style)
        content.append(title)
        
        # Date range
        if hasattr(schedule, 'week_start'):
            week_start_str = schedule.week_start
        else:
            # Handle if schedule is a dict
            week_start_str = schedule.get('week_start', datetime.now().isoformat())
        
        week_start = datetime.fromisoformat(week_start_str)
        week_end = week_start + timedelta(days=6)
        
        date_text = f"{week_start.strftime('%B %d')} - {week_end.strftime('%B %d, %Y')}"
        if subtitle:
            date_text = f"{subtitle}<br/>{date_text}"
        
        subtitle_para = Paragraph(date_text, self.subtitle_style)
        content.append(subtitle_para)
        
        # Additional info
        facility_type = getattr(facility, 'facility_type', 'General')
        zones = getattr(facility, 'zones', [])
        zones_count = len(zones) if zones else 0
        info_text = f"Facility Type: {facility_type} • Zones: {zones_count} • Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}"
        info_para = Paragraph(info_text, self.header_info_style)
        content.append(info_para)
        
        return content
    
    def _build_schedule_overview(self, assignments, staff):
        """Build schedule overview section"""
        content = []
        
        total_assignments = len(assignments)
        unique_staff = len(set(a.get('staff_id') for a in assignments))
        
        # Calculate shift distribution
        shift_counts = {}
        for assignment in assignments:
            shift = assignment.get('shift', 0)
            shift_counts[shift] = shift_counts.get(shift, 0) + 1
        
        overview_data = [
            ['Total Assignments', str(total_assignments)],
            ['Staff Scheduled', str(unique_staff)],
            ['Coverage Days', '7 days'],
        ]
        
        # Add shift breakdown
        for shift_id, count in shift_counts.items():
            shift_name = f"Shift {shift_id}"  # You can enhance this with actual shift names
            overview_data.append([shift_name, f"{count} assignments"])
        
        overview_table = Table(overview_data, colWidths=[2*inch, 1.5*inch])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        content.append(Paragraph("Schedule Overview", self.staff_name_style))
        content.append(overview_table)
        
        return content
    
    def _build_schedule_table(self, assignments, staff, facility):
        """Build the main schedule table"""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        # Get facility shifts or create default ones
        facility_shifts = facility.get('shifts', [
            {'shift_index': 0, 'name': 'Morning', 'start_time': '6:00 AM', 'end_time': '2:00 PM'},
            {'shift_index': 1, 'name': 'Afternoon', 'start_time': '2:00 PM', 'end_time': '10:00 PM'},
            {'shift_index': 2, 'name': 'Evening', 'start_time': '10:00 PM', 'end_time': '6:00 AM'}
        ])
        
        # Create staff lookup
        staff_dict = {s.get('id'): s.get('full_name', 'Unknown') for s in staff}
        
        # Build table data - organized by day and shift
        table_data = [['Staff'] + days]  # Header row
        
        # Group assignments by staff member
        staff_schedules = {}
        for assignment in assignments:
            staff_id = assignment.get('staff_id')
            if staff_id not in staff_schedules:
                staff_schedules[staff_id] = {}
            
            day = assignment.get('day', 0)
            shift = assignment.get('shift', 0)
            
            if day not in staff_schedules[staff_id]:
                staff_schedules[staff_id] = {}
            if day not in staff_schedules[staff_id]:
                staff_schedules[staff_id][day] = []
            
            # Get shift name
            shift_info = next((s for s in facility_shifts if s.get('shift_index') == shift), None)
            shift_name = shift_info.get('name', f'Shift {shift}') if shift_info else f'Shift {shift}'
            
            staff_schedules[staff_id][day].append(shift_name)
        
        # Build rows for each staff member
        for staff_member in staff:
            staff_id = staff_member.get('id')
            staff_name = staff_member.get('full_name', 'Unknown')
            
            row = [staff_name]
            
            # Add cell for each day
            for day_idx in range(7):
                if staff_id in staff_schedules and day_idx in staff_schedules[staff_id]:
                    shifts_for_day = staff_schedules[staff_id][day_idx]
                    cell_content = '\n'.join(shifts_for_day)
                else:
                    cell_content = '-'
                row.append(cell_content)
            
            table_data.append(row)
        
        # Create table
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Staff name column styling
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f9fafb')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            
            # Data cells styling
            ('BACKGROUND', (1, 1), (-1, -1), colors.white),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        
        return table
    
    def _build_individual_schedule_table(self, assignments, facility):
        """Build individual staff schedule table"""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        facility_shifts = facility.get('shifts', [
            {'shift_index': 0, 'name': 'Morning', 'start_time': '6:00 AM', 'end_time': '2:00 PM'},
            {'shift_index': 1, 'name': 'Afternoon', 'start_time': '2:00 PM', 'end_time': '10:00 PM'},
            {'shift_index': 2, 'name': 'Evening', 'start_time': '10:00 PM', 'end_time': '6:00 AM'}
        ])
        
        # Build schedule for this staff member
        schedule_by_day = {}
        for assignment in assignments:
            day = assignment.get('day', 0)
            shift = assignment.get('shift', 0)
            
            if day not in schedule_by_day:
                schedule_by_day[day] = []
            
            shift_info = next((s for s in facility_shifts if s.get('shift_index') == shift), None)
            if shift_info:
                shift_text = f"{shift_info.get('name')}\n{shift_info.get('start_time')} - {shift_info.get('end_time')}"
            else:
                shift_text = f"Shift {shift}"
            
            schedule_by_day[day].append(shift_text)
        
        # Build table data
        table_data = [['Day', 'Scheduled Shifts']]
        
        for day_idx, day_name in enumerate(days):
            if day_idx in schedule_by_day:
                shifts_text = '\n\n'.join(schedule_by_day[day_idx])
            else:
                shifts_text = 'No shifts scheduled'
            
            table_data.append([day_name, shifts_text])
        
        table = Table(table_data, colWidths=[1.5*inch, 4*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 1), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 12),
            ('LEFTPADDING', (0, 1), (-1, -1), 12),
            ('RIGHTPADDING', (0, 1), (-1, -1), 12),
        ]))
        
        return table
    
    def _build_staff_summary(self, assignments, staff):
        """Build staff summary section"""
        content = []
        
        # Calculate hours per staff member
        staff_hours = {}
        for assignment in assignments:
            staff_id = assignment.get('staff_id')
            if staff_id not in staff_hours:
                staff_hours[staff_id] = 0
            staff_hours[staff_id] += 8  # Assuming 8-hour shifts
        
        staff_dict = {s.get('id'): s.get('full_name', 'Unknown') for s in staff}
        
        summary_data = [['Staff Member', 'Scheduled Shifts', 'Total Hours']]
        
        for staff_member in staff:
            staff_id = staff_member.get('id')
            staff_name = staff_member.get('full_name', 'Unknown')
            
            shift_count = len([a for a in assignments if a.get('staff_id') == staff_id])
            total_hours = staff_hours.get(staff_id, 0)
            
            summary_data.append([staff_name, str(shift_count), f"{total_hours} hrs"])
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        content.append(Paragraph("Staff Summary", self.staff_name_style))
        content.append(summary_table)
        
        return content
    
    def _build_individual_summary(self, assignments, facility):
        """Build summary for individual staff member"""
        content = []
        
        total_shifts = len(assignments)
        total_hours = total_shifts * 8  # Assuming 8-hour shifts
        
        # Group by shift type
        shift_counts = {}
        facility_shifts = facility.get('shifts', [])
        
        for assignment in assignments:
            shift = assignment.get('shift', 0)
            shift_info = next((s for s in facility_shifts if s.get('shift_index') == shift), None)
            shift_name = shift_info.get('name', f'Shift {shift}') if shift_info else f'Shift {shift}'
            
            shift_counts[shift_name] = shift_counts.get(shift_name, 0) + 1
        
        summary_text = f"<b>Weekly Summary:</b><br/>"
        summary_text += f"Total Shifts: {total_shifts}<br/>"
        summary_text += f"Total Hours: {total_hours}<br/><br/>"
        
        if shift_counts:
            summary_text += "<b>Shift Breakdown:</b><br/>"
            for shift_name, count in shift_counts.items():
                summary_text += f"• {shift_name}: {count} shift{'s' if count != 1 else ''}<br/>"
        
        summary_para = Paragraph(summary_text, self.styles['Normal'])
        content.append(summary_para)
        
        return content
    
    def _build_schedule_metrics(self, assignments, staff, facility):
        """Build schedule metrics for summary PDF"""
        content = []
        
        total_assignments = len(assignments)
        total_staff = len(staff)
        scheduled_staff = len(set(a.get('staff_id') for a in assignments))
        
        # Calculate coverage percentage
        coverage_percentage = (scheduled_staff / total_staff * 100) if total_staff > 0 else 0
        
        metrics_text = f"""
        <b>Schedule Metrics</b><br/><br/>
        • Total Staff: {total_staff}<br/>
        • Staff Scheduled: {scheduled_staff}<br/>
        • Coverage: {coverage_percentage:.1f}%<br/>
        • Total Assignments: {total_assignments}<br/>
        • Average Shifts per Staff: {(total_assignments / scheduled_staff):.1f} shifts
        """
        
        metrics_para = Paragraph(metrics_text, self.styles['Normal'])
        content.append(metrics_para)
        
        return content
    
    def _build_staff_summary_table(self, assignments, staff):
        """Build staff summary table for summary PDF"""
        staff_dict = {s.get('id'): s for s in staff}
        staff_assignments = {}
        
        for assignment in assignments:
            staff_id = assignment.get('staff_id')
            if staff_id not in staff_assignments:
                staff_assignments[staff_id] = []
            staff_assignments[staff_id].append(assignment)
        
        table_data = [['Staff Member', 'Role', 'Shifts', 'Hours']]
        
        for staff_id, assignments_list in staff_assignments.items():
            staff_info = staff_dict.get(staff_id, {})
            name = staff_info.get('full_name', 'Unknown')
            role = staff_info.get('role', 'Staff')
            shift_count = len(assignments_list)
            hours = shift_count * 8
            
            table_data.append([name, role, str(shift_count), f"{hours}h"])
        
        table = Table(table_data, colWidths=[2*inch, 1.5*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb')),
        ]))
        
        return table
    
    def _build_footer(self):
        """Build PDF footer"""
        content = []
        
        footer_text = f"Generated by HospitalityScheduler on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>This schedule is subject to change. Please check for updates regularly."
        footer = Paragraph(footer_text, self.footer_style)
        content.append(footer)
        
        return content
    
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
        facility: Dict
    ) -> Dict[str, str]:
        """
        Generate individual PDF for each staff member
        
        Returns:
            Dict mapping staff_id to PDF URL
        """
        staff_pdfs = {}
        
        for staff_member in staff:
            staff_id = staff_member.get('id')
            staff_name = staff_member.get('full_name', 'staff')
            
            # Filter assignments for this staff member
            staff_assignments = [a for a in assignments if a.get('staff_id') == staff_id]
            
            if staff_assignments:  # Only generate PDF if staff has assignments
                pdf_data = await self.generate_schedule_pdf(
                    schedule, 
                    staff_assignments, 
                    [staff_member], 
                    facility, 
                    pdf_type="individual"
                )
                
                filename = f"schedule_{staff_name.replace(' ', '_')}_{schedule.week_start}"
                pdf_url = await self.save_pdf(pdf_data, filename)
                staff_pdfs[staff_id] = pdf_url
        
        return staff_pdfs