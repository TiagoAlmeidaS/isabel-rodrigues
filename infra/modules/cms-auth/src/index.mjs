/**
 * Intermediário OAuth do painel.
 *
 * O Sveltia CMS abre um popup, o popup manda o navegador pro GitHub, o GitHub
 * volta aqui com um código, e este código é trocado por um token. O token
 * volta pro painel por postMessage — nunca pela URL, nunca por cookie legível.
 *
 * Protocolo (o mesmo do sveltia-cms-auth / decap-cms):
 *   popup  -> opener : 'authorizing:github'
 *   opener -> popup  : qualquer mensagem, só para revelar a origem
 *   popup  -> opener : 'authorization:github:success:{"provider":..,"token":..}'
 *
 * A origem do opener vem do navegador no evento de mensagem, então não pode
 * ser forjada. Ainda assim é conferida contra a lista de domínios: token só
 * sai para origem conhecida.
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const PROVEDOR = 'github';
const ssm = new SSMClient({});

const CLIENT_ID = process.env.CLIENT_ID ?? '';
const PARAMETRO_SEGREDO = process.env.PARAM_CLIENT_SECRET ?? '';
const ESCOPO = process.env.SCOPE || 'repo,user';
const DOMINIOS = (process.env.ALLOWED_DOMAINS ?? '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/**
 * Cache com validade. Sem o prazo, um segredo rotacionado só passava a valer
 * quando a AWS reciclava o contêiner por conta própria — e até lá o login
 * falhava com "incorrect_client_credentials" sem motivo aparente, porque o
 * Parameter Store já tinha o valor novo. Cinco minutos mantêm a economia de
 * chamadas numa rajada de logins e limitam a espera depois de uma troca.
 */
const VALIDADE_CACHE_MS = 5 * 60 * 1000;
let segredoEmCache;
let segredoLidoEm = 0;

async function clientSecret() {
  const agora = Date.now();

  if (!segredoEmCache || agora - segredoLidoEm > VALIDADE_CACHE_MS) {
    const resposta = await ssm.send(
      new GetParameterCommand({ Name: PARAMETRO_SEGREDO, WithDecryption: true }),
    );
    // O trim evita que espaço ou quebra de linha guardados junto com o valor
    // derrubem o login: o GitHub compara byte a byte.
    segredoEmCache = (resposta.Parameter?.Value ?? '').trim();
    segredoLidoEm = agora;
  }

  return segredoEmCache;
}

/** Aceita 'exemplo.com.br' e '*.exemplo.com.br'. Lista vazia libera tudo. */
function dominioPermitido(hostname) {
  if (DOMINIOS.length === 0) return true;
  if (!hostname) return false;
  const alvo = hostname.toLowerCase();

  return DOMINIOS.some((padrao) => {
    if (padrao.startsWith('*.')) {
      const raiz = padrao.slice(2);
      return alvo === raiz || alvo.endsWith(`.${raiz}`);
    }
    return alvo === padrao;
  });
}

function origemPermitida(origem) {
  try {
    return dominioPermitido(new URL(origem).hostname);
  } catch {
    return false;
  }
}

/** Escapa para caber dentro de <script> sem fechar a tag. */
function paraScript(valor) {
  return JSON.stringify(valor)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function paginaResposta(estado, conteudo) {
  const corpo = `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Autenticando…</title></head>
<body>
<p style="font-family:system-ui;padding:24px">Conectando ao painel…</p>
<script>
(function () {
  var conteudo = ${paraScript(JSON.stringify(conteudo))};
  var estado = ${paraScript(estado)};
  var dominios = ${paraScript(DOMINIOS)};

  function permitida(origem) {
    if (dominios.length === 0) return true;
    try {
      var host = new URL(origem).hostname.toLowerCase();
      return dominios.some(function (padrao) {
        if (padrao.indexOf('*.') === 0) {
          var raiz = padrao.slice(2);
          return host === raiz || host.slice(-(raiz.length + 1)) === '.' + raiz;
        }
        return host === padrao;
      });
    } catch (e) {
      return false;
    }
  }

  window.addEventListener('message', function (evento) {
    // Erro pode ir para qualquer origem; token, só para origem conhecida.
    if (estado !== 'error' && !permitida(evento.origin)) return;
    if (!window.opener) return;
    window.opener.postMessage(
      'authorization:${PROVEDOR}:' + estado + ':' + conteudo,
      evento.origin
    );
    window.close();
  }, { once: true });

  if (window.opener) {
    window.opener.postMessage('authorizing:${PROVEDOR}', '*');
  }
})();
</script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
    body: corpo,
  };
}

function erro(codigo, mensagem) {
  // Sem isto o fluxo falha em silêncio: a página de erro vai para o painel,
  // que mostra uma mensagem genérica, e o CloudWatch não guarda pista
  // nenhuma. Nunca registre o token nem o segredo aqui.
  console.error('falha de autenticacao', JSON.stringify({ codigo, mensagem }));
  return paginaResposta('error', { provider: PROVEDOR, error: mensagem, errorCode: codigo });
}

function cookies(evento) {
  const bruto = evento.cookies ?? [];
  const mapa = {};
  for (const item of bruto) {
    const corte = item.indexOf('=');
    if (corte > 0) mapa[item.slice(0, corte).trim()] = item.slice(corte + 1);
  }
  return mapa;
}

function iniciar(evento) {
  const params = evento.queryStringParameters ?? {};
  const siteId = params.site_id ?? '';

  if (siteId && !dominioPermitido(siteId)) {
    return erro('UNSUPPORTED_DOMAIN', 'Domínio não autorizado a usar este painel.');
  }

  const estado = `${PROVEDOR}_${crypto.randomUUID()}`;
  const destino = new URL('https://github.com/login/oauth/authorize');
  destino.searchParams.set('client_id', CLIENT_ID);
  destino.searchParams.set('scope', params.scope || ESCOPO);
  destino.searchParams.set('state', estado);

  return {
    statusCode: 302,
    headers: { location: destino.toString(), 'cache-control': 'no-store' },
    cookies: [
      `csrf-token=${estado}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    ],
  };
}

async function retorno(evento) {
  const params = evento.queryStringParameters ?? {};
  const codigo = params.code;
  const estado = params.state;
  const salvo = cookies(evento)['csrf-token'];

  if (!codigo || !estado) {
    return erro('AUTH_CODE_REQUEST_FAILED', 'O GitHub não devolveu o código.');
  }

  // Sem isto, um terceiro poderia completar o fluxo no navegador da Isabel.
  if (!salvo || salvo !== estado) {
    return erro('CSRF_DETECTED', 'A sessão de login não confere. Tente de novo.');
  }

  let resposta;
  try {
    resposta = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: await clientSecret(),
        code: codigo,
      }),
    });
  } catch {
    return erro('TOKEN_REQUEST_FAILED', 'Não foi possível falar com o GitHub.');
  }

  if (!resposta.ok) {
    console.error('github recusou', JSON.stringify({ status: resposta.status }));
    return erro('TOKEN_REQUEST_FAILED', 'O GitHub recusou a troca do código.');
  }

  const dados = await resposta.json();

  if (dados.error || !dados.access_token) {
    // O motivo exato vem aqui — tipicamente bad_verification_code (código
    // reusado ou expirado) ou incorrect_client_credentials (o segredo no
    // Parameter Store não é o do OAuth App). Nenhum dos dois é segredo.
    console.error(
      'troca de token falhou',
      JSON.stringify({ error: dados.error, descricao: dados.error_description }),
    );
    return erro('TOKEN_REQUEST_FAILED', dados.error_description || 'Token não veio.');
  }

  console.log('token obtido', JSON.stringify({ escopo: dados.scope }));
  return paginaResposta('success', { provider: PROVEDOR, token: dados.access_token });
}

export const handler = async (evento) => {
  const caminho = evento.rawPath ?? '/';

  if (caminho.endsWith('/oauth/authorize') || caminho.endsWith('/auth')) {
    return iniciar(evento);
  }

  if (caminho.endsWith('/oauth/redirect') || caminho.endsWith('/callback')) {
    return retorno(evento);
  }

  return { statusCode: 404, headers: { 'content-type': 'text/plain' }, body: 'não encontrado' };
};
