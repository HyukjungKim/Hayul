// /api/* 는 서버가 처리하고, 나머지는 public/ 의 앱 파일을 그대로 보내요
import { handleApi } from './api.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url.pathname.slice(5).split('/').filter(Boolean));
    return env.ASSETS.fetch(request);
  },
};
