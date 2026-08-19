import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('sanitized Univen fixture', () => {
  it('contains the expected selectors for the core fields', () => {
    const fixture = readFileSync(new URL('../fixtures/univen/sanitized.html', import.meta.url), 'utf8');

    const expectedSelectors = [
      'id="imovel_inf_referencia"',
      'id="imovel_inf_tipo"',
      'id="imovel_inf_valvenda"',
      'id="imovel_cap_valcondominio"',
      'id="imovel_cap_valiptu"',
      'id="imovel_int_anunciointernet"',
      'id="imovel_inf_descricao"',
      'id="imovel_inf_cep"',
      'id="imovel_inf_endereco"',
      'id="imovel_inf_numero"',
      'id="imovel_inf_bairro"',
      'id="imovel_inf_cidade"',
      'id="imovel_inf_uf"',
      'id="imovel_det_dormitorios"',
      'id="imovel_det_suite"',
      'id="imovel_det_banheiros"',
      'id="imovel_det_garagens"',
      'id="imovel_det_areautil"',
      'id="imovel_det_areatotal"'
    ];

    for (const selector of expectedSelectors) {
      expect(fixture).toContain(selector);
    }

    expect(fixture).toContain('>Anuncio publico</textarea>');
    expect(fixture).toContain('>Descricao interna do imovel</textarea>');
    expect(fixture).toContain('value="01234-567"');
  });
});
