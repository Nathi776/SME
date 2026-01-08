import axios from 'axios';

const API = 'http://localhost:8000';

export const FinanceApi = {
    apply: (sme_id: number, amount: number, purpose: string) => {
        const token = localStorage.getItem("token");

        return axios.post(`${API}/finance/apply`, {
            sme_id,
            amount,
            purpose
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    getRequests: (sme_id: number) => {
        const token = localStorage.getItem("token");

        return axios.get(`${API}/finance/requests/${sme_id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};