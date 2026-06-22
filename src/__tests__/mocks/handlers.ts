import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:5826/fhir/r4b'

export const emptyBundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 0,
  entry: [],
}

export const patientFixture = {
  resourceType: 'Patient',
  id: 'test-patient-1',
  name: [{ given: ['Alice'], family: 'Smith' }],
  gender: 'female' as const,
  birthDate: '1990-05-15',
}

export const handlers = [
  http.get(`${BASE}/Patient`, () => HttpResponse.json(emptyBundle)),
  http.get(`${BASE}/Patient/:id`, ({ params }) =>
    HttpResponse.json({ ...patientFixture, id: params.id as string })
  ),
]
