# Host your own site

Your website is yours. You can download the whole thing whenever you like and put it online somewhere else, for free, in about ten minutes. You don't need to know any code.

You don't have to do any of this: we keep your site online for as long as {{brand}} runs. But it's good to know you can, and a copy on your own computer never hurts.

> **Only want your own domain name?** You don't need this guide: we connect a domain you own to your site with us, at no extra cost. Open your edit link and choose **Use your own domain**.

> **Before you start:** your web address will change. Your {{brand}} address (your-name.{{domain}}) only works with us. A free host gives you a new free address, or you can use a domain name of your own (step 4).

## 1. Download your site

Open the **edit link** from your welcome email, then press **Download your site** on the Go live step. Or use the **Download your site** link in that same email.

You get one file, a .zip, named after your web address. Inside is your whole site: the pages, your photos, the fonts and a short README.

![A zip file opening into a folder that holds index.html, privacy.html, a photos folder and a fonts folder](/guide/unzip.svg)

**Unzip it.** On a Windows computer, right-click the file and choose **Extract All**. On a Mac, double-click it. You now have a folder with **index.html** directly inside it: that's the folder to upload.

Want to check it first? Double-click **index.html** and your site opens in your browser, straight from your computer.

## 2. Free option A: Cloudflare Pages

Cloudflare is the company that hosts {{brand}} sites, and its free plan is plenty for a site like yours.

![Dragging your site's folder onto the upload box on a hosting website](/guide/drag.svg)

1. Make a free account at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. In the menu, go to **Workers & Pages**, press **Create application**, then choose to **drag and drop your files**.
3. Give your project a name. It becomes your free address: *your-name*.pages.dev.
4. Drag in your site's folder (the one with index.html directly inside), or the .zip itself, and press **Deploy**.

That's it: your site is online at the address Cloudflare shows you. The screens change from time to time, so if anything looks different, Cloudflare's own guide is here: [Pages: direct upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

## 3. Free option B: Netlify Drop

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag in your site's **unzipped** folder (Netlify wants the folder, not the .zip).
3. Your site is online straight away at a free address ending in .netlify.app.
4. **Sign up or log in to keep it.** Netlify removes a dropped site after about an hour unless you claim it with a free account.
5. Netlify may make new sites **private** at first, so only you can see them. If visitors are asked to log in, open your site's settings in Netlify and choose to make it **public**.

Netlify's own guide: [Create deploys](https://docs.netlify.com/deploy/create-deploys/).

## 4. Use your own domain name

A domain name of your own (like *smithplumbing.co.uk*) looks more professional and stays yours whichever host you use. You buy it from a domain company (a "registrar") for around £10 a year.

![Your own domain name pointing at your site on the host](/guide/domain.svg)

The steps are the same shape everywhere:

1. In your host's dashboard, find **Custom domains** (Cloudflare) or **Domain management** (Netlify) and add your domain.
2. The host shows you one or two settings, called DNS records. Copy them into the DNS settings at the company you bought your domain from. Some hosts offer to manage the domain for you instead: that works too.
3. Wait. It usually works within an hour, but it can take up to two days. The padlock (https) is switched on for you, free.

Each host's own step-by-step guide:

- Cloudflare Pages: [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- Netlify: [Get started with domains](https://docs.netlify.com/manage/domains/get-started-with-domains/)

## 5. Keeping it up to date

Your downloaded copy doesn't change when you edit with {{brand}}. When you want to change something:

1. Open your **edit link**, make your changes and press **Publish changes**.
2. Press **Download your site** again and unzip the new copy.
3. Upload the new folder to your host. On Cloudflare, open your project and choose **Create a new deployment**. On Netlify, open your site's **Deploys** page and drag the new folder onto it.

Your address stays the same; only the content changes.

## Good to know

- **The README file** is just for you. You can leave README.txt out when you upload, or it can be read by anyone at your address.
- **Search engines** need a little time to find a site at a new address. Tell Google about it with [Google Search Console](https://search.google.com/search-console/about) if you like.
- **Your site has no hidden extras:** no tracking, no adverts, nothing that phones home. It's plain web pages, so it works on any host.
- **Stuck?** Email [{{email}}](mailto:{{email}}) and we'll help.
