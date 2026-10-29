# ds-qa

DSH 插件。装进 profile 之后，右侧栏打开正式 Workbench。

页面地址编译为 `http://mino.local:50104`，与正式 Nexus 同源。连不上时只显示「无法连接服务器」。

```sh
dsh plugin --profile web add /Users/changpengcheng/code/ds-qa
```

装完重启 DSH。左侧栏底部有 **Workbench**。点它在主区域打开页面，再点一次或点「关闭」收起。`package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，DSH 才会把这个包激活成插件。
