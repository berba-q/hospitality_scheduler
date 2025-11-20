import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Schedule, Staff } from '@/types/schedule'
import { Facility, FacilityShift, FacilityZone } from '@/types/facility'

// Define the UserOptions type locally since it's not exported from jspdf-autotable
interface UserOptions {
    startY?: number
    head?: string[][]
    body?: (string | { content: string; styles?: { fillColor?: [number, number, number] } })[][]
    theme?: 'striped' | 'grid' | 'plain'
    headStyles?: {
        fillColor?: [number, number, number]
        textColor?: [number, number, number]
        fontSize?: number
        fontStyle?: 'bold' | 'normal' | 'italic'
        halign?: 'left' | 'center' | 'right'
    }
    styles?: Record<string, unknown>
    columnStyles?: Record<string, unknown>
    didDrawPage?: (data: { settings: { margin: { left: number } }; doc: jsPDF }) => void
    margin?: { top: number }
}

export const generateSchedulePDF = (
    schedule: Schedule,
    facility: Facility,
    staffList: Staff[],
    shifts: FacilityShift[],
    zones: FacilityZone[]
) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    })

    // --- Helper Functions ---

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    const getWeekDates = (startDateStr: string): Date[] => {
        const start = new Date(startDateStr)
        const dates: Date[] = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            dates.push(d)
        }
        return dates
    }

    const getShiftName = (shiftIndex: number): string => {
        const shift = shifts.find(s => s.shift_index === shiftIndex || s.shift_order === shiftIndex) // Try both index and order
        if (shift) return `${shift.shift_name} (${shift.start_time}-${shift.end_time})`

        // Fallback if no shift found (e.g. legacy data)
        return `Shift ${shiftIndex + 1}`
    }

    const getZoneName = (zoneId?: string): string => {
        if (!zoneId) return ''
        const zone = zones.find(z => z.id === zoneId || z.zone_id === zoneId)
        return zone ? `\n[${zone.zone_name}]` : ''
    }

    // --- Data Preparation ---

    const weekDates = getWeekDates(schedule.week_start)
    const dateHeaders = weekDates.map(d => formatDate(d))
    const headers = [['Staff Member', ...dateHeaders]]

    const rows = staffList.map(staff => {
        const rowData: (string | { content: string; styles?: { fillColor?: [number, number, number] } })[] = [staff.full_name]

        for (let i = 0; i < 7; i++) {
            // Find assignment for this staff on this day (i is day index 0-6)
            const assignment = schedule.assignments?.find(
                a => a.staff_id === staff.id && a.day === i
            )

            if (assignment) {
                const shiftInfo = getShiftName(assignment.shift)
                const zoneInfo = getZoneName(assignment.zone_id)

                // Optional: Color coding based on shift (simplified)
                // You could map shift IDs to specific colors here

                rowData.push(`${shiftInfo}${zoneInfo}`)
            } else {
                rowData.push('-')
            }
        }
        return rowData
    })

    // --- PDF Generation ---

    // Header
    doc.setFontSize(22)
    doc.setTextColor(40, 40, 40)
    doc.text(facility.name, 14, 20)

    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text(`Weekly Schedule: ${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}`, 14, 30)

    doc.setFontSize(10)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38)

    // Table
    autoTable(doc, {
        startY: 45,
        head: headers,
        body: rows,
        theme: 'grid',
        headStyles: {
            fillColor: [66, 133, 244], // Google Blue-ish
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 } // Staff name column
        },
        // Add footer with page numbers
        didDrawPage: (data: { settings: { margin: { left: number } }; doc: jsPDF }) => {
            const str = 'Page ' + (doc as any).internal.getNumberOfPages()
            doc.setFontSize(10)
            const pageSize = doc.internal.pageSize
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
            doc.text(str, data.settings.margin.left, pageHeight - 10)
        },
        margin: { top: 45 }
    })

    // Save
    const filename = `Schedule_${facility.name.replace(/\s+/g, '_')}_${schedule.week_start}.pdf`
    doc.save(filename)
}
