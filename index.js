import fs from 'fs';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { anonymizeProxy, closeAnonymizedProxy } from 'proxy-chain';
import { newInjectedPage } from "fingerprint-injector";

import data from './output.json' assert { type: "json" };

puppeteer.use(StealthPlugin());

const schools = data;

const writeToFile = async (data) => {
	await fs.writeFileSync('output.json', JSON.stringify(data));
};

const getRandomProxy = (setNo = 1) => {
	try {
		const data = fs.readFileSync(`./proxies/proxies-set-${setNo}.txt`, 'utf8');

		const proxies = data.toString().split('\n');

		return proxies[Math.floor(Math.random() * proxies.length)];
	} catch(e) {
		console.log('Error during proxy file reading', e);
	}
};

const scrapePage = async (index) => {
	const originalUrl = `http://${getRandomProxy()}`;

	const newProxyUrl = await anonymizeProxy(originalUrl);

	const browser = await puppeteer.launch({
		headless: false,
		args: [`--proxy-server=${newProxyUrl}`],
	});

	const page = await newInjectedPage(
		browser,
		{
			// constraints for the generated fingerprint
			fingerprintOptions: {
				browsers: ["chrome", "firefox", "safari", "edge"],
				devices: ['desktop'],
				operatingSystems: ['windows'],
				screen: {
					minWidth: 2560,
					minHeight: 1440,
				},
				locales: ['ru-RU,ru;q=0.9', 'ru'],
			},
		},
	);

	await page.goto(`https://schoolotzyv.ru${schools[index].link}`);

	await page.waitForXPath('//tr[td/b[contains(text(), "2020 г.")]]', { timeout: 1200000 });

	const imgSrc = await page.evaluate( () => {
		// Используем XPath для поиска первого <tr>, который содержит <td> с <b>, текст которого "2020 г."
		let firstTrXPath = '//tr[td/b[contains(text(), "2020 г.")]]';
		let firstTr = document.evaluate(firstTrXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

		console.log(firstTrXPath);

		if (!firstTr) {
			firstTrXPath = '//tr[td/b[contains(text(), "2021 г.")]]';
			firstTr = document.evaluate(firstTrXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		}

		// Проверяем, есть ли такой элемент и получаем следующий за ним <tr>
		if (firstTr) {
			const nextTr = firstTr.nextElementSibling;

			// Если следующий <tr> существует, и в нем есть <td> с <img>, возвращаем src атрибут элемента <img>
			if (nextTr) {
				const imgElement = nextTr.querySelector('td > img');
				return imgElement ? imgElement.src : null;
			}
		}

		return null;
	});

	if (imgSrc) {
		console.log(`#${index} is successfully parsed!`);

		schools[index].img = imgSrc;
		schools[index].result = true;

		await writeToFile(schools);
	} else {
		console.log(`#${index} error...`);
		schools[index].result = false;
	}

	await browser.close();

	await closeAnonymizedProxy(newProxyUrl, true);
};


for (let i = 0; i < schools.length; i++) {
	if (schools[i].result) {
		console.log(`#${i} is already done`);
	} else {
		await scrapePage(i);
	}
}