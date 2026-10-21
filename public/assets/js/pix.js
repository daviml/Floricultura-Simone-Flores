// Pix "copia e cola" (BR Code do Banco Central) gerado no próprio navegador, sem serviço externo.

function campo(id, valor) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

function crc16(texto) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function semAcento(t, max) {
  return t.normalize('NFD').replace(/[^\x20-\x7E]/g, '').toUpperCase().slice(0, max).trim();
}

function cpfValido(d) {
  if (/^(\d)\1{10}$/.test(d)) return false;
  const dig = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    return ((s * 10) % 11) % 10;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

// Telefone vira +55..., CPF/CNPJ só dígitos, e-mail e chave aleatória ficam como estão.
export function chaveNormalizada(chave) {
  const t = String(chave || '').trim();
  if (!t || t.includes('@') || /^[0-9a-f]{8}-/i.test(t)) return t;
  const d = t.replace(/\D/g, '');
  if (d.length === 14) return d;
  if (d.length === 11 && cpfValido(d) && !t.startsWith('+')) return d;
  if (d.length === 13 && d.startsWith('55')) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return t;
}

export function chaveLegivel(chave) {
  const c = chaveNormalizada(chave);
  const tel = c.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  if (tel) return `(${tel[1]}) ${tel[2]}-${tel[3]}`;
  return c;
}

export function pixCopiaECola({ chave, nome, cidade, valor }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chaveNormalizada(chave));
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor ? campo('54', Number(valor).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', semAcento(nome || 'Simone Flores', 25)) +
    campo('60', semAcento(cidade || 'Uberlandia', 15)) +
    campo('62', campo('05', '***')) +
    '6304';
  return corpo + crc16(corpo);
}
