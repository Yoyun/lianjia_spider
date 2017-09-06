const request = require('request');
const cheerio = require('cheerio');
const async = require('async');
const optgen = require('./optgen.js');

let max_page = 3;       // 最大页数
let zf_link_list = [];      // 待解析房屋链接

// 解析租房页面
function parse_zufang(url, callback) {
    console.log('Parse: ' + url);
    let opt = optgen.genOpt(url, "GET");
    request(opt, (err, resp, body) => {
        if (err) {
            console.error(err);

            callback(err)
        } else if (resp.statusCode === 200) {
            let $ = cheerio.load(body);
            let title = $('div.content > div.title > h1.main').first().text().trim();
            let price = $('div.zf-content > div.price > span.total').first().text().trim();
            let unit = $('div.zf-content > div.price > span.unit').first().text().trim();
            let infos = [];
            $('div.zf-content > div.zf-room > p').toArray().forEach((item) => {
                infos.push($(item).text());
            });

            let data = {
                title, price, unit, infos
            };
            callback(null, data)
        }
    })
}

// 解析租房列表页面
function parse_zufang_list(page = 1) {
    let url = 'https://sz.lianjia.com/zufang/pg' + page;
    console.log("Parse: " + url);
    let opt = optgen.genOpt(url, "GET");
    request(opt, (err, resp, body) => {
        if (err) {
            console.error(err)
        } else if (resp.statusCode === 200) {
            let $ = cheerio.load(body)

            let fzs = $('#house-lst > li'); // 获取房屋列表
            if (fzs && fzs.length > 0) {
                fzs.toArray().forEach((item) => {
                    let url = $(item).find('div.pic-panel > a').attr('href');
                    zf_link_list.push(url);     // 存入待解析数组
                });
                if (page <= max_page) {
                    parse_zufang_list(++page);
                } else {
                    parse_zf_link_list();
                }
            } else {
                console.log('no data');
                parse_zf_link_list();
            }
        }
    })
}

// 并发抓取房屋信息
function parse_zf_link_list() {
    if (zf_link_list && zf_link_list.length > 0) {
        console.log('开始提取房屋数据, 总共：' + zf_link_list.length + '条');
        async.mapLimit(zf_link_list, 5,
            (url, callback) => {
                parse_zufang(url, callback);
            },
            (err, result) => {
                console.log(result);
                if (err) {
                    console.error(err)
                }
            })
    }
}

parse_zufang_list(1);
