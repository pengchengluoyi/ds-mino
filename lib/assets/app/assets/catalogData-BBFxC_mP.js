function t(r,o,n){if(!r||!Array.isArray(r[o]))throw new Error(`${n}响应缺少 ${o} 数组，请重试或核对服务版本。`);return r}export{t as c};
