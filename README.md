# ds-mino

DSH 插件。左侧栏底部是 **ds-mino**。点它在主区域打开这套前端，再点一次或点「关闭」收起。

页面是仓库里 `workbench/` 的前端，由插件自己打开，不另开一个站点。接口仍走编译进去的 Nexus origin：`http://mino.local:50104`。连不上时只显示「无法连接服务器」。

```sh
dsh plugin --profile web add github:pengchengluoyi/ds-mino
```

`package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，DSH 才会把这个包激活成插件。原先的 `ds-qa` 要先卸掉。
