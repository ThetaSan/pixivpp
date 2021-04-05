# pixiv++
## 概要
PC web版 pixivを拡張するuser scriptです。
主に以下のような機能があります。

* ダウンロード機能 (Ugoira/Single/Multi)
* より高速なブックマークタグ追加ソリューション 
* 画面サイズに合わせたDiscoveryページ。
* その他UIの微妙な調整

## How To Install
#### 用意するもの  
* PC
* [tampermonkeyをインストール出来るブラウザ](https://www.tampermonkey.net/)  
*なお、ブラウザは極力最新のものを使用してください。  
*[詳細な対応バージョンリスト](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining#browser_compatibility)

#### 手順
1. ブラウザに[tampermonkey](https://www.tampermonkey.net/)を入れる。
2. [pixiv++.user.jsのデータ](https://raw.githubusercontent.com/ThetaSan/pixivpp/master/pixiv++.user.js)にアクセスして、インストールしてください。  
*もし、すでにpixivのページを開いていたら一度リロードしてください。  
*pixivにログインしていなければしてください。
3. 一番上にあるpixivのロゴの下に、"with pixiv++"の文字があれば成功です。

## 簡単な使い方説明
#### より高速なブックマークタグ追加ソリューション 
白いハートマーク(artworkページでなくても可)に対して右クリックすることでブックマークタグ追加画面を開けます。
主にDiscovery機能におけるブックマークが高速になります。

#### Download機能
artworkページの"いいね！"や報告関連のボタンがある場所に新しく"Download"ボタンが追加されるのでそれを押してください。
サイズによっては時間がかかるので大人しく待っていてください。  
また、ダウンロードした .ugoira ファイルを再生したい場合は別途ソフトウェア([例えばUgoiraPlay](https://github.com/ThetaSan/UgoiraPlay/releases))をダウンロードしてください。