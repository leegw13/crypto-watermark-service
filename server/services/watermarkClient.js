import fetch from 'node-fetch';

export async function requestApply(payload) {
  await fetch(process.env.WM_SERVICE_URL + '/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': process.env.INTERNAL_TOKEN
    },
    body: JSON.stringify(payload)
  });
}
