import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Patient = Record<{
    id: string;
    name: string;
    age: nat64;
    dateOfBirth: string;
    gender: string;
    contactNumber: string;
    medicalHistory: Vec<string>;
    treatments: Vec<string>; // Treatment IDs associated with this patient
    createdDate: nat64;
    updatedAt: Opt<nat64>;
    
}>;

type Treatment = Record<{
    id: string;
    patientId: string;
    date: string;
    medications: Vec<string>;
    duration: string;
    treatingDoctor: string;
    instructions: string;
    createdDate: nat64;
    updatedAt: Opt<nat64>;
}>;

type PatientPayload = Record<{
    name: string;
    age: nat64;
    dateOfBirth: string;
    gender: string;
    contactNumber: string;

}>
type TreatmentPayload = Record<{
    patientId: string;
    date: string;
    medications: Vec<string>;
    duration: string;
    treatingDoctor: string;
    instructions: string;
}>;


const patientStorage = new StableBTreeMap<string, Patient>(0, 44, 512);
const treatmentStorage = new StableBTreeMap<string, Treatment>(1, 44, 512);

// Load the Initial batch of Patients
$query
export function getInitialPatients(): Result<Vec<Patient>, string> {
    const initialPatients = patientStorage.values().slice(0, 4);
    return Result.Ok(initialPatients);
}

// Load more Patients as the user scrolls down
$query
export function loadMorePatients(offset: number, limit: number): Result<Vec<Patient>, string> {
    const morePatients = patientStorage.values().slice(offset, offset + limit);
    return Result.Ok(morePatients);
}
// Arrange Patients by Name
$query
export function arrangePatientsByName(): Result<Vec<Patient>, string> {
    const patients = patientStorage.values().sort((a, b) => a.name.localeCompare(b.name));
    return Result.Ok(patients);
}
// Loading a Specific Patient
$query
export function getPatient(id: string): Result<Patient, string> {
    return match(patientStorage.get(id), {
        Some: (patient) => {
            return Result.Ok<Patient, string>(patient);
        },
        None: () => Result.Err<Patient, string>(`Patient with id:${id} not found`),
    });
}

// Get Patient by Contact Number
$query
export function getPatientByContactNumber(contactNumber: string): Result<Vec<Patient>, string> {
    const relatedPatients = patientStorage.values().filter((patient) => patient.contactNumber === contactNumber);
    return Result.Ok(relatedPatients);
}

// Search Patient
$query
export function searchPatients(searchInput: string): Result<Vec<Patient>, string> {
    const lowerCaseSearchInput = searchInput.toLowerCase();
    try {
        const searchedPatients = patientStorage.values().filter(
            (patient) =>
                patient.name.toLowerCase().includes(lowerCaseSearchInput) ||
                patient.contactNumber.toLowerCase().includes(lowerCaseSearchInput)
        );
        return Result.Ok(searchedPatients);
    } catch (err) {
        return Result.Err('Error finding the patient');
    }
}

// Allows a group/Organisation to add a Patient
$update
export function addPatient(payload: PatientPayload): Result<Patient, string> {
    // Validate input data
    if (!payload.name || !payload.age || !payload.dateOfBirth ||
        !payload.gender || !payload.contactNumber) {
        return Result.Err<Patient, string>('Missing or invalid input data');
    }

    try {
        const newPatient: Patient = {
            id: uuidv4(),
            medicalHistory: [],
            treatments: [],
            createdDate: ic.time(),
            updatedAt: Opt.None,
            ...payload
        };
        patientStorage.insert(newPatient.id, newPatient);
        return Result.Ok<Patient, string>(newPatient);
    } catch (err) {
        return Result.Err<Patient, string>('Issue encountered when Creating Patient');
    }
}

// Adding Medical History to the Patient created
$update
export function insertMedicalHistory(id: string, medicalHistory: string): Result<Patient, string> {
    // Validate input data
    if (!medicalHistory) {
        return Result.Err<Patient, string>('Invalid medical history');
    }

    return match(patientStorage.get(id), {
        Some: (patient) => {
            const updatedMedicalHistory = [...patient.medicalHistory, medicalHistory];
            const updatedPatient: Patient = { ...patient, medicalHistory: updatedMedicalHistory, updatedAt: Opt.Some(ic.time()) };
            patientStorage.insert(patient.id, updatedPatient);
            return Result.Ok<Patient, string>(updatedPatient);
        },
        None: () => Result.Err<Patient, string>(`Patient with id:${id} not found`),
    });
}

// Adding Treatment to the Patient created
$update
export function addTreatment(payload: TreatmentPayload): Result<Treatment, string> {
    // Validate input data
    if (!payload.patientId || !payload.date || !payload.medications || !payload.duration || !payload.treatingDoctor) {
        return Result.Err<Treatment, string>('Missing or invalid input data');
    }

    try {
        const newTreatment: Treatment = {
            id: uuidv4(),
            createdDate: ic.time(),
            updatedAt: Opt.None,
            ...payload
        };
        treatmentStorage.insert(newTreatment.id, newTreatment);
        return Result.Ok<Treatment, string>(newTreatment);
    } catch (err) {
        return Result.Err<Treatment, string>('Issue encountered when Creating Treatment');
    }
}

// Loading a Specific Treatment
$query
export function getTreatment(id: string): Result<Treatment, string> {
    return match(treatmentStorage.get(id), {
        Some: (treatment) => {
            return Result.Ok<Treatment, string>(treatment);
        },
        None: () => Result.Err<Treatment, string>(`Treatment with id:${id} not found`),
    });
}

// Get Treatments by Patient
$query
export function getTreatmentsByPatient(patientId: string): Result<Vec<Treatment>, string> {
    const patientTreatments = treatmentStorage.values().filter((treatment) => treatment.patientId === patientId);
    return Result.Ok(patientTreatments);
}

// Get Patients
$query
export function getPatients(): Result<Vec<Patient>, string> {
    const patients = patientStorage.values();
    return Result.Ok(patients);
}

// Get Treatments
$query
export function getTreatments(): Result<Vec<Treatment>, string> {
    const treatments = treatmentStorage.values();
    return Result.Ok(treatments);
}

// Add Treatment to Patient
$update
export function insertTreatmentToPatient(patientId: string, treatmentId: string): Result<Patient, string> {
    return match(patientStorage.get(patientId), {
        Some: (patient) => {
            const updatedTreatments = [...patient.treatments, treatmentId];
            const updatedPatient: Patient = { ...patient, treatments: updatedTreatments, updatedAt: Opt.Some(ic.time()) };
            patientStorage.insert(patient.id, updatedPatient);
            return Result.Ok<Patient, string>(updatedPatient);
        },
        None: () => Result.Err<Patient, string>(`Patient with id:${patientId} not found`),
    });
}

// Update Patient
$update
export function updatePatient(id: string, payload: PatientPayload): Result<Patient, string> {
    return match(patientStorage.get(id), {
        Some: (patient) => {
            const updatedPatient: Patient = { ...patient, ...payload, updatedAt: Opt.Some(ic.time()) };
            patientStorage.insert(patient.id, updatedPatient);
            return Result.Ok<Patient, string>(updatedPatient);
        },
        None: () => Result.Err<Patient, string>(`Patient with id:${id} not found`),
    });
}

// Update Treatment
$update
export function updateTreatment(id: string, payload: TreatmentPayload): Result<Treatment, string> {
    return match(treatmentStorage.get(id), {
        Some: (treatment) => {
            const updatedTreatment: Treatment = { ...treatment, ...payload, updatedAt: Opt.Some(ic.time()) };
            treatmentStorage.insert(treatment.id, updatedTreatment);
            return Result.Ok<Treatment, string>(updatedTreatment);
        },
        None: () => Result.Err<Treatment, string>(`Treatment with id:${id} not found`),
    });
}

// Delete Patient
$update
export function deletePatient(id: string): Result<Patient, string> {
    return match(patientStorage.get(id), {
        Some: (patient) => {
            patientStorage.remove(id);
            return Result.Ok<Patient, string>(patient);
        },
        None: () => Result.Err<Patient, string>(`Patient with id:${id} not found, could not be deleted`),
    });
}

// Delete Treatment
$update
export function deleteTreatment(id: string): Result<Treatment, string> {
    return match(treatmentStorage.get(id), {
        Some: (treatment) => {
            treatmentStorage.remove(id);
            return Result.Ok<Treatment, string>(treatment);
        },
        None: () => Result.Err<Treatment, string>(`Treatment with id:${id} not found, could not be deleted`),
    });
}

// UUID workaround
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    },
};
