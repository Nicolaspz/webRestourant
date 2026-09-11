import { api } from '@/services/api';
import { normalizePosSettings, type PosSettings } from '@/types/pos-settings';

export type OrganizationSummary = {
  id: string;
  name: string;
  address?: string;
  nif?: string;
  imageLogo?: string | null;
  posSettings?: Partial<PosSettings> | null;
};

export const organizationService = {
  async getById(id: string): Promise<OrganizationSummary> {
    const response = await api.get(`/organization/${id}`);
    return response.data.organization || response.data;
  },

  async savePosSettings(organization: OrganizationSummary, settings: PosSettings) {
    const payload = new FormData();
    payload.append('name', organization.name || '');
    payload.append('address', organization.address || '');
    payload.append('nif', organization.nif || '');
    payload.append('posSettings', JSON.stringify(normalizePosSettings(settings)));
    const response = await api.put(`/organization/${organization.id}`, payload);
    return (response.data.organization || response.data) as OrganizationSummary;
  },
};
