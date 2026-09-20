// CloudFront Function (viewer request) no comportamento /fit-in/*.
//
// Reduz o Accept do navegador a um de três valores ANTES da consulta ao
// cache — é isso que mantém a chave de cache em três variantes por largura
// em vez de uma por navegador. A camada de trás decide o formato lendo
// este mesmo cabeçalho.
function handler(event) {
  var request = event.request;
  var headers = request.headers;
  var accept = headers.accept ? headers.accept.value : '';

  var normalizado = 'image/jpeg';
  if (accept.indexOf('image/avif') >= 0) {
    normalizado = 'image/avif';
  } else if (accept.indexOf('image/webp') >= 0) {
    normalizado = 'image/webp';
  }

  headers.accept = { value: normalizado };
  return request;
}
