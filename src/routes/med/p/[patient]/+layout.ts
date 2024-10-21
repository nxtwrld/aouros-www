
import type { PageLoad } from './$types';
import { patients } from '$slib/med/patients/patients';
import { type Patient } from '$slib/med/types.d.ts';


export const prerender = false;
 
export const load = (async ({ params}) => {

    const patient: Patient = patients.find(patient => patient.uid === params.patient);



    if (!patient) {
        return {
            status: 404,
            error: new Error(`Profile ${params.patient} not found`)
        };
    }


    return { 
        patient
    };

}) satisfies PageLoad;