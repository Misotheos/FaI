import { describe, expect, it } from 'vitest';
import { univenFields } from '../../src/integrations/univen/univen.fields';

describe('Univen field mapping', () => {
  it('exposes the expected selectors and keeps the public/internal description split', () => {
    expect(univenFields.reference).toBe('#imovel_inf_referencia');
    expect(univenFields.type).toBe('#imovel_inf_tipo');
    expect(univenFields.salePrice).toBe('#imovel_inf_valvenda');
    expect(univenFields.condominiumFee).toBe('#imovel_cap_valcondominio');
    expect(univenFields.iptu).toBe('#imovel_cap_valiptu');
    expect(univenFields.advertisementDescription).toBe('#imovel_int_anunciointernet');
    expect(univenFields.internalDescription).toBe('#imovel_inf_descricao');
    expect(univenFields.cep).toBe('#imovel_inf_cep');
    expect(univenFields.street).toBe('#imovel_inf_endereco');
    expect(univenFields.number).toBe('#imovel_inf_numero');
    expect(univenFields.neighborhood).toBe('#imovel_inf_bairro');
    expect(univenFields.city).toBe('#imovel_inf_cidade');
    expect(univenFields.state).toBe('#imovel_inf_uf');
    expect(univenFields.bedrooms).toBe('#imovel_det_dormitorios');
    expect(univenFields.suites).toBe('#imovel_det_suite');
    expect(univenFields.bathrooms).toBe('#imovel_det_banheiros');
    expect(univenFields.parkingSpaces).toBe('#imovel_det_garagens');
    expect(univenFields.usableArea).toBe('#imovel_det_areautil');
    expect(univenFields.totalArea).toBe('#imovel_det_areatotal');
  });
});
