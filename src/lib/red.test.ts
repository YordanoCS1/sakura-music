import { describe, expect, it } from 'vitest';
import { esIpRedLocal, PUERTO_REMOTO, urlControlRemoto } from './red';

describe('esIpRedLocal', () => {
  it.each(['192.168.1.23', '192.168.0.1', '10.0.0.5', '172.16.0.1', '172.31.255.254'])(
    'acepta la IP privada %s',
    (ip) => {
      expect(esIpRedLocal(ip)).toBe(true);
    },
  );

  it.each(['127.0.0.1', '172.15.0.1', '172.32.0.1', '8.8.8.8', '192.169.1.1'])(
    'rechaza la IP %s',
    (ip) => {
      expect(esIpRedLocal(ip)).toBe(false);
    },
  );

  it.each(['', '192.168.1', '192.168.1.1.1', '192.168.1.x', '256.1.1.1', 'abc'])(
    'rechaza el valor inválido %s',
    (valor) => {
      expect(esIpRedLocal(valor)).toBe(false);
    },
  );
});

describe('urlControlRemoto', () => {
  it('arma la URL con el puerto del servidor', () => {
    expect(urlControlRemoto('192.168.1.23')).toBe(`http://192.168.1.23:${PUERTO_REMOTO}`);
    expect(PUERTO_REMOTO).toBe(17342);
  });

  it('incluye el PIN en la URL del QR', () => {
    expect(urlControlRemoto('192.168.1.23', '123456')).toBe(
      `http://192.168.1.23:${PUERTO_REMOTO}/?pin=123456`,
    );
  });
});
