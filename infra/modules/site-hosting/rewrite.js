// CloudFront Function (viewer request) — URLs limpas para um site estático.
// /ensaios/newborn/  ->  /ensaios/newborn/index.html
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else if (!uri.includes('.')) {
    request.uri = uri + '/index.html';
  }

  return request;
}
