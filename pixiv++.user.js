// ==UserScript==
// @name         pixiv++
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Extension for pixiv (PC Web version)
// @author       theta
// @match        *://www.pixiv.net/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @require      https://raw.githubusercontent.com/Stuk/jszip/master/dist/jszip.min.js
// ==/UserScript==
(function () {
    'use strict';
    /* LICENSE INFO
       pixiv++ (by theta) : GPLv3

       JSZip (by Stuk) : GPLv3 And MIT
       https://github.com/Stuk/jszip/blob/master/LICENSE.markdown
    */

    var url_changed_events = [];
    /*
        Pixivは"/artworks/XXX"から"/artworks/YYY"へのリンク偏移時等で、
        Ajaxを介してHtmlを動的に変更する(=userscriptがリロードされない)ため、
        少なくとも /artworks へのDom操作はDynamicMain()でやります。
        DocumentのEventやheadは残留するので、Main()でやります。
        /artworks 以外への操作に関しては基本的にここでやります。
    */
    function Main() { // One Time
        // easy bookmark tag
        function _OpenBookmarkWindow(id) {
            window.open(
                "https://www.pixiv.net/bookmark_add.php?type=illust&illust_id=" + id,
                "_blank",
                // "toolbar",
            );
        }
        document.addEventListener("contextmenu", e => {
            var path_has_svg = false;
            const pathes = e.composedPath(); // firefox
            pathes.forEach((d) => {
                // without polyline, circle (< > button, UgoiraPlayButton)
                path_has_svg |=
                    d.tagName?.toUpperCase() == "SVG" &&
                    d.querySelector("polyline") == null &&
                    d.querySelector("circle") == null;
            });
            var in_users = location.pathname.startsWith("/users/");
            for (var d of pathes) {
                //force string
                if (d.classList?.contains("gtm-illust-recommend-bookmark")) { // recommend, discovery
                    _OpenBookmarkWindow(d.getAttribute("data-gtm-recommend-illust-id"));
                    break;
                } else if (d.classList?.contains("gtm-main-bookmark")) { // artwork page
                    _OpenBookmarkWindow(location.pathname.match(/\/artworks\/(\d+)/)[1]);
                    break;
                } else if (d.classList?.contains("_one-click-bookmark")) { // discovery (alternative), follow user
                    _OpenBookmarkWindow(d.getAttribute("data-id"));
                    break;
                } else if (path_has_svg && d.tagName == "DIV" && d.getAttribute("type") == "illust") { // other bookmark btn (user profile, etc)
                    _OpenBookmarkWindow(d.querySelector("a").href.split("/").pop());
                    break;
                } else if (in_users && path_has_svg && d.tagName == "LI") { // topic (user profile)
                    const a_tag = d.querySelector("div>div>div>a");
                    if (a_tag && d.querySelector("div>div>div>div>button>svg")) { // strict
                        _OpenBookmarkWindow(a_tag.href.split("/").pop());
                        break;
                    }
                }
            };
        });

        AddElmAtr(document.head, "style",
            // プレミアム会員登録誘導で紹介される画像にアクセスできるようにする。
            "#root div>section div>aside>ul>li { z-index: 9; }\n" +
            // (/artworks) set < > btn background
            "#root nav>div>button { background: #FFF7; border-radius: 8px; }\n" + // user art
            "#root figcaption>div>div>div>button { background: #FFF8; border-radius: 8px; }\n" + // おすすめ作品
            // bookmark_add.phpのthumbnailを拡張 
            ".bookmark-detail-unit .thumbnail-container { top: 5px !important; left: 10px !important; width: 250px !important;　}\n" +
            ".bookmark-detail-unit .thumbnail-container > ._work { transform: scale(1.5); top: 40px; }");

        window.addEventListener("load", _ => { // onload
            // install checker
            AddElmAtr(document.body, "b", "with pixiv++").style = "position: absolute; top: 45px; left: 90px;";

            switch (location.pathname) {
                case "/discovery":
                    let dis_body = document.querySelector("#wrapper>div.layout-body");
                    // discovery layout fix
                    DomWaiter(dis_body, "div>div.gtm-illust-recommend-zone>div").then(il => {
                        AddElmAtr(dis_body, "style",
                            `#wrapper, #wrapper>div.layout-body { width: 1779px; } .${il.classList[0]} { margin: 64px 43px !important; transform: scale(1.4) !important; }` +
                            `@media screen and (max-width:1780px){ #wrapper, #wrapper>div.layout-body { width: 1300px; } .${il.classList[0]} { margin: 40px 22px !important; transform: scale(1.2) !important; } }` +
                            `@media screen and (max-width:1350px){ #wrapper, #wrapper>div.layout-body { width:  970px; } .${il.classList[0]} { margin: 24px 12px !important; transform: scale(1) !important;} }` // default
                        );
                    });
                    break;
                case "/history.php":
                    const HistObs = new MutationObserver(_ => {
                        AddElmAtr(document.body, "style",
                            "._history-invitation-modal { display: none !important; } span.trial._history-item { opacity: 100 !important; }")
                        for (let his of document.body.querySelectorAll(".trial._history-item")) {
                            let bgi = his.style.backgroundImage;
                            let hid = bgi.match(/\/(\d+?)_p0_/)[1];
                            his.onclick = _ => { window.open(`https://www.pixiv.net/artworks/${hid}`); };
                        }
                        HistObs.disconnect();
                    });
                    HistObs.observe(document.body.querySelector("div.no-item"), { attributes: true, attributeFilter: ["class"] });
                    break;
            }
        });
    } // Main

    Main();


    var last_visit_url = location.href;
    DynamicMain(); // first time
    // 以下の処理は /artworksに限定すると不安定になるので、全ページに対してやります。
    new MutationObserver(_ => { // page change
        if (last_visit_url == location.href) { return; } // one time
        last_visit_url = location.href;
        while (url_changed_events.length > 0) { url_changed_events.pop()?.call(); }
        // wait load
        DomWaiter(document.body, "#root").then(DynamicMain);
    }).observe(document.getElementsByTagName("title")[0], { childList: true }); // hack

    function DynamicMain() {
        const PROTOCOL = location.protocol;
        var artworks_match = location.pathname.match(/\/artworks\/(\d+)/);
        if (artworks_match != null) { // art page
            const ART_ID = artworks_match[1];
            DomWaiter(document.body, "#root div>div>div>div>main>section>div>div>figure>div[role=presentation]>div")
                .then(figure_sel => { // img loaded
                    figure_sel = figure_sel.parentElement;
                    var dl_atag =
                        AddElmAtr(
                            AddElmAtr(document.querySelector("#root main>section>div>div>div>div[style]>div>section"), "div", null, {
                                style: "margin-right: 20px; font-size: 16px;"
                            }), // parent div
                            "a", "Download", {
                            style: "position: relative; top: 5px; cursor: pointer;",
                        });
                    var dl_target_atag = AddElmAtr(dl_atag.parentElement, "a", null, {
                        style: "display: none",
                        download: "dummy"
                    });
                    dl_atag.startDownload = function () {
                        dl_atag.text = "Processing...";
                        dl_atag.setAttribute("processing", "true");
                    }
                    dl_atag.endDownload = function () {
                        dl_atag.text = "Download";
                        dl_atag.setAttribute("processing", "false");
                    }
                    const ART_TITLE = document.querySelector("figcaption>div>div>h1")?.textContent ?? "NoTitle";
                    var is_ugoira = figure_sel.getElementsByTagName("canvas").length > 0;
                    if (is_ugoira) {
                        dl_atag.onclick = _ => { // Ugoira Downloader
                            if (dl_atag.getAttribute("processing") == "true") { return; }
                            var Ugoira_Meta_Raw = null;
                            dl_atag.startDownload();
                            HttpStringRequest(`${PROTOCOL}//www.pixiv.net/ajax/illust/${ART_ID}/ugoira_meta`)
                                .then(str => {
                                    Ugoira_Meta_Raw = str;
                                    var Ugoira_Meta = JSON.parse(str);
                                    if (Ugoira_Meta == null || Ugoira_Meta["error"]) {
                                        throw "Ugoira error!";
                                    }
                                    return HttpBlobRequest(Ugoira_Meta["body"]["originalSrc"].replace(/^https*:/, PROTOCOL));
                                })
                                .then(r => {
                                    var zip = new JSZip();
                                    return zip.loadAsync(r);
                                })
                                .then(zip => {
                                    zip.file("ugoira_meta", Ugoira_Meta_Raw);
                                    return zip.generateAsync({
                                        type: "blob",
                                        compression: "DEFLATE",
                                        compressionOptions: { level: 7 }
                                    });
                                })
                                .then(blob => {
                                    dl_target_atag.download = `${ART_ID}_${ART_TITLE}.ugoira`;
                                    dl_target_atag.href = window.URL.createObjectURL(blob);
                                    dl_target_atag.click();
                                    window.URL.revokeObjectURL(dl_target_atag.href);
                                })
                                .catch(e => {
                                    alert("error! : " + e);
                                })
                                .finally(dl_atag.endDownload);
                        }

                    } else { // not ugoira
                        dl_atag.onclick = e => { // img(s) downloader
                            if (dl_atag.getAttribute("processing") == "true") { return; }
                            dl_atag.startDownload();
                            var img_count = 1;

                            img_count = parseInt(
                                figure_sel.querySelector("div>div>div>div>div>div>span").textContent.split("/")[1]
                            );
                            if (isNaN(img_count)) {
                                alert("error! : img_count is NaN");
                                dl_atag.endDownload();
                                return;
                            }
                            const url_template = figure_sel.querySelector("div div[role=presentation] a").href.replace(/^https*:/, PROTOCOL);
                            const url_template_replacer = new RegExp(`(/${ART_ID}_p)\\d(\\.\\w+)`);
                            // todo : common ext?
                            const img_ext = url_template.match(url_template_replacer)[2];
                            if (img_count == 1) { // one img
                                HttpBlobRequest(url_template)
                                    .then(blob => {
                                        dl_target_atag.download = `${ART_ID}_${ART_TITLE}${img_ext}`;
                                        dl_target_atag.href = window.URL.createObjectURL(blob);
                                        dl_target_atag.click();
                                        window.URL.revokeObjectURL(dl_target_atag.href);
                                    })
                                    .catch(e => {
                                        alert("error! : " + e);
                                    })
                                    .finally(dl_atag.endDownload);
                            } else { // 2+ imgs
                                var prms = [];
                                for (var _p = 0; _p < img_count; _p++) {
                                    var dl_url = url_template.replace(url_template_replacer, `$1${_p}$2`);
                                    prms.push(HttpBlobRequest(dl_url));
                                }
                                Promise.all(prms)
                                    .then(results => {
                                        var zip = new JSZip();
                                        for (var _p = 0; _p < results.length; _p++) {
                                            zip.file(`${ART_ID}_p${_p}${img_ext}`, results[_p]);
                                        }
                                        return zip.generateAsync({
                                            type: "blob",
                                            compression: "DEFLATE",
                                            compressionOptions: { level: 7 }
                                        });
                                    })
                                    .then(blob => {
                                        dl_target_atag.download = `${ART_ID}_${ART_TITLE}.zip`;
                                        dl_target_atag.href = window.URL.createObjectURL(blob);
                                        dl_target_atag.click();
                                        window.URL.revokeObjectURL(dl_target_atag.href);
                                    })
                                    .catch(e => {
                                        alert("error! : " + e);
                                    })
                                    .finally(dl_atag.endDownload);
                            }
                        }
                    }
                }) //dom wait figure
        } else { // not art page
            // => Main()
        }


        // function GetUploadDate(id) {
        //     var UrlInfo = document.querySelector(`div div a[href="/artworks/${id}"] div img`).src;
        //     // yyyy/dd/hhh/mm/ss
        //     return UrlInfo.match(/img\/(\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2})\//)[1];
        //  }
    } // DynamicMain

    function HttpStringRequest(url, ref = null) {
        return new Promise((res, rej) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: { "referer": ref || location.href },
                onreadystatechange: xhr => {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        if (xhr.status == 200 || xhr.status == 304) {
                            res(xhr.responseText)
                        } else {
                            rej(xhr.status);
                        }
                    }
                }
            })
        });
    }

    function HttpBlobRequest(url, ref = null) {
        return new Promise((res, rej) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: { "referer": ref || location.href },
                responseType: "blob",
                onreadystatechange: xhr => {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        if (xhr.status == 200 || xhr.status == 304) {
                            res(xhr.response)
                        } else {
                            rej(xhr.status);
                        }
                    }
                }
            })
        });
    }

    function DomWaiter(parent, selector, timeout = 8000) {
        return new Promise((res, rej) => {
            var sel = parent.querySelector(selector);
            if (sel != null) {
                res(sel);
            } else {
                var timeout_handle = null;
                var disconected = false;
                const observer = new MutationObserver(_ => {
                    var sel = parent.querySelector(selector);
                    if (sel != null) {
                        clearTimeout(timeout_handle);
                        observer.disconnect();
                        disconected = true;
                        res(sel);
                    }
                });
                observer.observe(parent, { childList: true, subtree: true })
                url_changed_events.push(_ => { // Dispose
                    if (!disconected) { observer.disconnect(); }
                    clearTimeout(timeout_handle);
                    rej("urlchanged");
                });
                if (timeout != null && timeout >= 0) {
                    timeout_handle = setTimeout(_ => {
                        observer.disconnect();
                        rej("timeout");
                    }, timeout);
                }
            }
        });

    }

    function AddElmAtr(par, tag, tex = null, atr = {}) {
        let el = document.createElement(tag);
        el.textContent = tex;
        Object.keys(atr).forEach(x => { el.setAttribute(x, atr[x]); })
        return par.appendChild(el);
    }
})();