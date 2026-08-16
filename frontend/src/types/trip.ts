export type Trip = {
    id: string
    destination: string
    startDate: string
    endDate: string
    type: string
    budget: number
    currency: string
}

export type NewTripForm = {
    destination: string
    startDate: string
    endDate: string
    type: string
    budget: string
    currency: string
}

export const initialNewTripForm: NewTripForm = {
    destination: '',
    startDate: '',
    endDate: '',
    type: 'CityBreak',
    budget: '',
    currency: 'EUR',
}
