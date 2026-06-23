import { patientDisplayName, patientAge, formatDate, formatDateTime, formatRelativeTime } from '@/lib/fhir/display'
import { EXT_LANGUAGE, EXT_NAME_LANGUAGE } from '@/lib/fhir/client'
import type { Patient } from '@medplum/fhirtypes'

// Fixed point in time: Saturday 15 Jun 2024, noon UTC
const NOW = new Date('2024-06-15T12:00:00.000Z')

// ─── patientDisplayName ───────────────────────────────────────────────────────

describe('patientDisplayName', () => {
  it('returns the English name (entry with no language extension)', () => {
    const p: Patient = {
      resourceType: 'Patient',
      name: [
        { given: ['Alice'], family: 'Smith' },
        { given: ['أليس'], family: 'سميث', extension: [{ url: EXT_NAME_LANGUAGE, valueCode: 'ar' }] },
      ],
    }
    expect(patientDisplayName(p)).toBe('Alice Smith')
  })

  it('finds the English name even when the Arabic name is listed first', () => {
    const p: Patient = {
      resourceType: 'Patient',
      name: [
        { given: ['أليس'], family: 'سميث', extension: [{ url: EXT_LANGUAGE, valueCode: 'ar' }] },
        { given: ['Alice'], family: 'Smith' },
      ],
    }
    expect(patientDisplayName(p)).toBe('Alice Smith')
  })

  it('includes prefix in the display name', () => {
    const p: Patient = {
      resourceType: 'Patient',
      name: [{ prefix: ['Dr.'], given: ['John'], family: 'Doe' }],
    }
    expect(patientDisplayName(p)).toBe('Dr. John Doe')
  })

  it('joins multiple given names', () => {
    const p: Patient = {
      resourceType: 'Patient',
      name: [{ given: ['Mary', 'Jane'], family: 'Watson' }],
    }
    expect(patientDisplayName(p)).toBe('Mary Jane Watson')
  })

  it('falls back to name.text when given and family are absent', () => {
    const p: Patient = {
      resourceType: 'Patient',
      name: [{ text: 'John Doe' }],
    }
    expect(patientDisplayName(p)).toBe('John Doe')
  })

  it('falls back to the first name entry when every entry carries a language extension', () => {
    const p: Patient = {
      resourceType: 'Patient',
      name: [
        { given: ['أليس'], family: 'سميث', extension: [{ url: EXT_NAME_LANGUAGE, valueCode: 'ar' }] },
      ],
    }
    expect(patientDisplayName(p)).toBe('أليس سميث')
  })

  it('returns "Unknown Patient" for an empty name array', () => {
    const p: Patient = { resourceType: 'Patient', name: [] }
    expect(patientDisplayName(p)).toBe('Unknown Patient')
  })

  it('returns "Unknown Patient" when name is absent', () => {
    expect(patientDisplayName({ resourceType: 'Patient' })).toBe('Unknown Patient')
  })
})

// ─── patientAge ──────────────────────────────────────────────────────────────

describe('patientAge', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW) // 2024-06-15
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "—" when birthDate is absent', () => {
    expect(patientAge({ resourceType: 'Patient' })).toBe('—')
  })

  it('calculates age correctly for a past birthday this year', () => {
    // Jan 1 1990 → turned 34 on Jan 1 2024, still 34 on Jun 15 2024
    expect(patientAge({ resourceType: 'Patient', birthDate: '1990-01-01' })).toBe('34')
  })

  it('returns the correct age when today IS the birthday', () => {
    // Jun 15 1990 → turns 34 today
    expect(patientAge({ resourceType: 'Patient', birthDate: '1990-06-15' })).toBe('34')
  })

  it('subtracts 1 when the birthday has not yet occurred (tomorrow)', () => {
    // Jun 16 1990 → birthday is tomorrow, still 33
    expect(patientAge({ resourceType: 'Patient', birthDate: '1990-06-16' })).toBe('33')
  })

  it('subtracts 1 when the birthday falls next month', () => {
    // Jul 1 1990 → birthday next month, still 33
    expect(patientAge({ resourceType: 'Patient', birthDate: '1990-07-01' })).toBe('33')
  })
})

// ─── formatDate ──────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('returns "—" for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate()).toBe('—')
  })

  it('formats a known date in en-US short-month style', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })
})

// ─── formatDateTime ──────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('returns "—" for undefined', () => {
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime()).toBe('—')
  })

  it('includes a recognisable date part and a HH:MM time part', () => {
    const result = formatDateTime('2024-01-15T10:30:00')
    expect(result).toContain('2024')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

// ─── formatRelativeTime ───────────────────────────────────────────────────────

describe('formatRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW) // 2024-06-15T12:00:00Z
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "—" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('—')
    expect(formatRelativeTime()).toBe('—')
  })

  it('returns "just now" for < 60 seconds ago', () => {
    expect(formatRelativeTime('2024-06-15T11:59:30.000Z')).toBe('just now')
  })

  it('returns singular "1 min ago"', () => {
    expect(formatRelativeTime('2024-06-15T11:59:00.000Z')).toBe('1 min ago')
  })

  it('returns plural "5 mins ago"', () => {
    expect(formatRelativeTime('2024-06-15T11:55:00.000Z')).toBe('5 mins ago')
  })

  it('returns singular "1 hr ago"', () => {
    expect(formatRelativeTime('2024-06-15T11:00:00.000Z')).toBe('1 hr ago')
  })

  it('returns plural "2 hrs ago"', () => {
    expect(formatRelativeTime('2024-06-15T10:00:00.000Z')).toBe('2 hrs ago')
  })

  it('returns singular "1 day ago"', () => {
    expect(formatRelativeTime('2024-06-14T12:00:00.000Z')).toBe('1 day ago')
  })

  it('returns plural "3 days ago"', () => {
    expect(formatRelativeTime('2024-06-12T12:00:00.000Z')).toBe('3 days ago')
  })

  it('returns singular "1 month ago" (31 days)', () => {
    // Jun 15 − May 15 = 31 days → floor(31/30) = 1 month
    expect(formatRelativeTime('2024-05-15T12:00:00.000Z')).toBe('1 month ago')
  })

  it('returns plural "3 months ago" (92 days)', () => {
    // Jun 15 − Mar 15 = 92 days → floor(92/30) = 3 months
    expect(formatRelativeTime('2024-03-15T12:00:00.000Z')).toBe('3 months ago')
  })

  it('returns singular "1 yr ago" (366 days — 2024 is a leap year)', () => {
    // Jun 15 2024 − Jun 15 2023 = 366 days → mo=12 → yr=1
    expect(formatRelativeTime('2023-06-15T12:00:00.000Z')).toBe('1 yr ago')
  })

  it('returns plural "2 yrs ago" (731 days)', () => {
    // Jun 15 2024 − Jun 15 2022 = 731 days → mo=24 → yr=2
    expect(formatRelativeTime('2022-06-15T12:00:00.000Z')).toBe('2 yrs ago')
  })
})
