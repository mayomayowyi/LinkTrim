from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1] / 'src'
js='''window.__messages=[];window.chrome=window.chrome||{};window.chrome.runtime={sendMessage:async (m)=>{window.__messages.push(m);return {ok:true}}};'''
html0='''<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:22px;background:#222;color:white;min-height:1400px"></body></html>'''

with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 def load(url,body):
  ctx=b.new_context(viewport={'width':1000,'height':650})
  ctx.add_init_script(js)
  page=ctx.new_page()
  page.set_content(html0.replace('</body>',body+'</body>'))
  from urllib.parse import urlparse
  u=urlparse(url)
  page.evaluate("loc => { window.__testLocation=loc; window.__messages=[];window.chrome=window.chrome||{};window.chrome.runtime={sendMessage:async m=>{window.__messages.push(m);return {ok:true};}}; }", {'hostname':u.hostname,'pathname':u.path,'href':url})
  page.add_script_tag(path=str(R/'card-links.js'))
  source=(R/'inline-buttons.js').read_text()
  source=source.replace('(() => {','(() => { const location = window.__testLocation;',1)
  page.add_script_tag(content=source)
  page.wait_for_timeout(500)
  return ctx,page
 
 yt='''<ytd-rich-grid-media id="ytcard" style="display:block;width:340px;height:260px;position:relative">
  <ytd-thumbnail style="display:block;width:320px;height:185px;position:relative;background:#527cb0">
   <a id="thumbnail" href="/watch?v=44lW4WTZZjM&list=RD44lW4WTZZjM&index=2" style="display:block;width:320px;height:185px"><span>thumbnail</span></a>
  </ytd-thumbnail><a href="/watch?v=44lW4WTZZjM&list=RD44lW4WTZZjM&index=2">VIDEO TITLE</a>
 </ytd-rich-grid-media>'''
 ctx,page=load('https://www.youtube.com/',yt)
 page.mouse.move(83,83)
 page.wait_for_timeout(200)
 portal=page.locator('.linktrim-card-portal')
 assert portal.is_visible(), 'YouTube card portal not visible'
 assert page.locator('.linktrim-card-portal [data-kind="link"]').is_visible()
 assert page.locator('.linktrim-card-portal [data-kind="playlist"]').is_visible()
 # YouTube creates an extra preview overlay; portal must survive DOM replacement.
 page.evaluate('''() => { document.querySelector('ytd-thumbnail').innerHTML='<div style="width:320px;height:185px;background:#862">YouTube preview replaced contents</div>'; const preview=document.createElement('div');preview.id='yt-native';preview.style.cssText='position:fixed;left:22px;top:22px;width:320px;height:185px;background:#903a88;z-index:100000;pointer-events:none'; document.body.append(preview); }''')
 page.wait_for_timeout(600)
 assert portal.is_visible(), 'YouTube overlay was lost after preview change'
 bounds=portal.bounding_box()
 print('YT overlay pos',bounds)
 page.mouse.move(bounds['x']+18,bounds['y']+17)
 page.wait_for_timeout(120)
 assert portal.is_visible(), 'YouTube overlay disappears when hovered'
 page.locator('.linktrim-card-portal [data-kind="link"]').click()
 page.locator('.linktrim-card-portal [data-kind="playlist"]').click()
 print('YT messages',page.evaluate('window.__messages'))
 assert page.evaluate('window.__messages.length')==2
 assert page.evaluate('window.__messages[1].mode')=='playlist'
 ctx.close()

 amazon='''<div id="imageBlock" style="position:relative;width:540px;height:400px;background:#eee">
  <div id="imgTagWrapperId" style="display:block;width:420px;height:375px;background:#ccc"><img id="landingImage" alt="product"></div>
  <div id="shareIcon_feature_div" style="position:absolute;left:470px;top:6px"><button id="shareIcon" aria-label="シェア" style="width:34px;height:34px">Share</button></div></div>'''
 ctx,page=load('https://www.amazon.co.jp/dp/B0DNDXMLR7/?ref_=foo',amazon)
 ctl=page.locator('.linktrim-amazon-page-control')
 assert ctl.is_visible(), 'Amazon detail control not visible'
 assert ctl.bounding_box()['x'] < page.locator('#shareIcon').bounding_box()['x']
 ctl.locator('button').click()
 assert page.evaluate('window.__messages.length')==1
 assert page.evaluate('window.__messages[0].url').startswith('https://www.amazon.co.jp/dp/B0DNDXMLR7/')
 ctx.close()

 wiki='''''''''<h1 id="firstHeading" class="mw-first-heading" style="display:block;width:700px;background:#fff;color:#222;font-size:28px"><span class="mw-page-title-main">ウェルテル効果</span></h1><main><div id="mw-content-text" style="padding:30px;background:#fff;color:#222;height:400px">
 <div class="mw-search-results"><a id="wiki-search" href="/wiki/%E6%9D%B1%E4%BA%AC?wprov=sfla1">東京</a></div>
 <p>本文の <a id="wiki-article" href="/wiki/%E6%97%A5%E6%9C%AC#%E6%AD%B4%E5%8F%B2">日本</a> へのリンク</p>
 <a id="wiki-external" href="https://example.org/wiki/test">External</a>
 </div></main>'''''''''
 ctx,page=load('https://ja.wikipedia.org/w/index.php?search=%E6%9D%B1%E4%BA%AC',wiki)
 assert page.locator('.linktrim-wikipedia-title-control').is_visible()
 assert page.locator('#firstHeading .mw-page-title-main').inner_text() == 'ウェルテル効果'
 assert page.locator('.linktrim-wikipedia-page-control').count() == 0
 title=page.locator('#firstHeading .mw-page-title-main').bounding_box()
 title_button=page.locator('.linktrim-wikipedia-title-control').bounding_box()
 assert title_button['x'] >= title['x']+title['width'], 'Wikipedia button should follow title text'
 assert title_button['y'] < title['y'] + title['height'] + 15
 page.wait_for_timeout(550)
 assert page.locator('.linktrim-wikipedia-title-control').count() == 1, 'Duplicate title copy button'
 # Wikipedia may replace the title during page updates; the button must be restored.
 page.evaluate('''() => {const heading=document.querySelector('#firstHeading'); heading.innerHTML='<span class="mw-page-title-main">非常に長い記事名のコピー操作を確認するための見出し</span>';}''')
 page.wait_for_timeout(500)
 assert page.locator('.linktrim-wikipedia-title-control').count() == 1, 'Title copy button was not restored after redraw'
 # Search result article: move to the article link and then into the portal.
 link=page.locator('#wiki-search').bounding_box()
 page.mouse.move(link['x']+4,link['y']+link['height']/2)
 page.wait_for_timeout(250)
 portal=page.locator('.linktrim-card-portal')
 assert portal.is_visible(), 'Wikipedia search result portal missing'
 portal_pos=portal.bounding_box()
 # Move smoothly across gap and click; hover must not collapse.
 page.mouse.move(portal_pos['x']+15,portal_pos['y']+15,steps=12)
 assert portal.is_visible(), 'Wikipedia button vanished as mouse moved to button'
 page.locator('.linktrim-card-portal [data-kind="link"]').click()
 assert page.evaluate('window.__messages[0].url').endswith('/wiki/%E6%9D%B1%E4%BA%AC')
 # Same behavior for article links.
 article=page.locator('#wiki-article').bounding_box()
 page.mouse.move(article['x']+4,article['y']+article['height']/2)
 page.wait_for_timeout(200)
 assert portal.is_visible(), 'Wikipedia article link portal missing'
 page.locator('.linktrim-card-portal [data-kind="link"]').click()
 assert '#%E6%AD%B4%E5%8F%B2' in page.evaluate('window.__messages[1].url')
 page.locator('.linktrim-wikipedia-title-control .linktrim-copy').click()
 assert page.evaluate('window.__messages.length') == 3
 ctx.close()
 print('Wikipedia hover and page copy PASS')
 b.close()
print('Browser simulation PASS')
