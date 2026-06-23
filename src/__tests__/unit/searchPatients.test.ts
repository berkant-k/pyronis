import { searchPatients } from '@/lib/fhir/patients'
import { fhirFetch } from '@/lib/fhir/client'
import type { Bundle, Patient } from '@medplum/fhirtypes'

// Mock fhirFetch so we can assert which params were sent without
// triggering the real auth/network chain.
jest.mock('@/lib/fhir/client', () => ({
  ...jest.requireActual('@/lib/fhir/client'),
  fhirFetch: jest.fn(),
}))

const mockedFhirFetch = jest.mocked(fhirFetch)

// ─── Fixtures ────────────────────────────────────────────────────────────────

function emptyBundle(): Bundle {
  return { resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] }
}

function bundleOf(...patients: Patient[]): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: patients.length,
    entry: patients.map((resource) => ({ resource })),
  }
}

const patientA: Patient = { resourceType: 'Patient', id: 'p1', name: [{ given: ['Alice'], family: 'Smith' }] }
const patientB: Patient = { resourceType: 'Patient', id: 'p2', name: [{ given: ['Bob'], family: 'Jones' }] }

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('searchPatients', () => {
  beforeEach(() => {
    mockedFhirFetch.mockResolvedValue(emptyBundle())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // ── Early exit ──────────────────────────────────────────────────────────────

  describe('early exit', () => {
    it('returns [] for an empty string without fetching', async () => {
      expect(await searchPatients('')).toEqual([])
      expect(mockedFhirFetch).not.toHaveBeenCalled()
    })

    it('returns [] for a whitespace-only string without fetching', async () => {
      expect(await searchPatients('   ')).toEqual([])
      expect(mockedFhirFetch).not.toHaveBeenCalled()
    })
  })

  // ── Query routing ──────────────────────────────────────────────────────────

  describe('query routing', () => {
    it('fires name + identifier for a single word containing letters', async () => {
      await searchPatients('Ahmed')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ name: 'Ahmed' }))
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: 'Ahmed' }))
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ phone: expect.anything() }))
    })

    it('fires name only for a full name (words separated by spaces)', async () => {
      await searchPatients('Ahmed Smith')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ name: 'Ahmed Smith' }))
      // Spaces make isIdentLike false → no identifier or phone search
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: expect.anything() }))
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ phone: expect.anything() }))
      expect(mockedFhirFetch).toHaveBeenCalledTimes(1)
    })

    it('fires identifier + phone for a 7-digit number', async () => {
      await searchPatients('1234567')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '1234567' }))
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ phone: '1234567' }))
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ name: expect.anything() }))
      expect(mockedFhirFetch).toHaveBeenCalledTimes(2)
    })

    it('fires identifier only for a short numeric string (< 7 digits)', async () => {
      await searchPatients('12345')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '12345' }))
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ phone: expect.anything() }))
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ name: expect.anything() }))
      expect(mockedFhirFetch).toHaveBeenCalledTimes(1)
    })

    it('fires identifier + phone for an 11-digit QID', async () => {
      await searchPatients('28412345678')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '28412345678' }))
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ phone: '28412345678' }))
      expect(mockedFhirFetch).toHaveBeenCalledTimes(2)
    })
  })

  // ── MRN/MR prefix stripping ─────────────────────────────────────────────────

  describe('prefix stripping', () => {
    it('strips MRN- prefix before querying', async () => {
      await searchPatients('MRN-001234')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '001234' }))
      expect(mockedFhirFetch).not.toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: 'MRN-001234' }))
    })

    it('strips MR- prefix before querying', async () => {
      await searchPatients('MR-001234')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '001234' }))
    })

    it('strips prefix case-insensitively (mrn-)', async () => {
      await searchPatients('mrn-001234')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '001234' }))
    })

    it('strips prefix case-insensitively (MRN-)', async () => {
      await searchPatients('MRN-001234')
      expect(mockedFhirFetch).toHaveBeenCalledWith('Patient', expect.objectContaining({ identifier: '001234' }))
    })
  })

  // ── Result handling ─────────────────────────────────────────────────────────

  describe('result handling', () => {
    it('returns patients from the bundle', async () => {
      mockedFhirFetch.mockResolvedValue(bundleOf(patientA))
      const result = await searchPatients('Ahmed Smith')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('deduplicates a patient returned by both name and identifier searches', async () => {
      // 'Ahmed' fires name + identifier → each call returns patientA
      mockedFhirFetch.mockResolvedValue(bundleOf(patientA))
      const result = await searchPatients('Ahmed')
      // Even though fhirFetch is called twice (name + identifier), result should have 1 entry
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })

    it('merges distinct patients from name and identifier searches', async () => {
      mockedFhirFetch
        .mockResolvedValueOnce(bundleOf(patientA)) // name search
        .mockResolvedValueOnce(bundleOf(patientB)) // identifier search
      const result = await searchPatients('Ahmed')
      expect(result).toHaveLength(2)
      const ids = result.map((p) => p.id)
      expect(ids).toContain('p1')
      expect(ids).toContain('p2')
    })

    it('returns an empty array when the bundle has no entries', async () => {
      const result = await searchPatients('Ahmed Smith')
      expect(result).toEqual([])
    })
  })
})
