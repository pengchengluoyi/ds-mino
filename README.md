# ds-mino

DSH 插件。左侧栏底部是 **ds-mino**。点它在主区域打开这套前端，再点一次或点「关闭」收起。

页面是仓库里 `workbench/` 的前端，由插件自己打开。接口经插件转到本机 `127.0.0.1:50104`，不使用 `mino.local`。

更新不要覆盖安装目录。在添加插件里填写下面这一行，不要用 `https://` 开头的地址：

```sh
github:pengchengluoyi/ds-mino
```

页面右上角的「更新」做的是同一件事。

```sh
dsh plugin --profile web add github:pengchengluoyi/ds-mino
```

`package.json` 里的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，DSH 才会把这个包激活成插件。原先的 `ds-qa` 要先卸掉。
