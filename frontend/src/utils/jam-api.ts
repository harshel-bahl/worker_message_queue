import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
}

export interface ICollection {
    id: string;
    collection_name: string;
    companies: ICompany[];
    total: number;
}

export interface ICompanyBatchResponse {
    companies: ICompany[];
}

const BASE_URL = 'http://localhost:8000';

export async function getCompanies(offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/companies`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsById(id: string, offset?: number, limit?: number): Promise<ICollection> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${id}`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections`);
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function modifyCompaniesInCollection(collectionId: string, companyIds: number[], action: string): Promise<any> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/${collectionId}/modify_companies`, {
            company_ids: companyIds,
            action: action,
        });
        return response.data;
    } catch (error) {
        console.error('Error modifying companies in collection:', error);
        throw error;
    }
}

export async function getTaskStatus(taskId: string): Promise<any> {
    try {
        const response = await axios.get(`${BASE_URL}/tasks/${taskId}/status`);
        return response.data;
    } catch (error) {
        console.error('Error fetching task status:', error);
        throw error;
    }
}

export async function selectAllCompanies(sourceCollectionId: string, targetCollectionId: string): Promise<any> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/${sourceCollectionId}/select_all/${targetCollectionId}`);
        return response.data;
    } catch (error) {
        console.error('Error selecting all companies:', error);
        throw error;
    }
}

