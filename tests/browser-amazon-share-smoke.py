"""Browser fixture for product-page placement and non-product fallback."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1] / "src"

def load(page, location, body):
    page.set_content(f'<!doctype html><html><body style="margin:0;min-height:1400px">{body}</body></html>')
    page.evaluate("""url => {
      window.__testLocation = new URL(url);
      window.__messages = [];
      window.chrome = {runtime:{sendMessage: async message => {window.__messages.push(message); return {ok:true}}}};
    }""", location)
    page.add_script_tag(path=str(root / "card-links.js"))
    code = (root / "inline-buttons.js").read_text(encoding="utf-8")
    code = code.replace('(() => {', '(() => { const location = window.__testLocation;', 1)
    page.add_script_tag(content=code)
    page.wait_for_timeout(450)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width":1600,"height":800})
    page = ctx.new_page()
    product = '''<div id="imageBlock" style="position:relative;width:690px;height:680px;padding-top:55px;float:left;background:#fafafa">
      <div id="imgTagWrapperId" style="width:550px;height:550px;background:#eee"><img id="landingImage" alt="product"></div>
      <div id="shareIcon_feature_div" style="position:absolute;left:620px;top:60px">
        <button id="shareIcon" aria-label="シェア" style="width:34px;height:34px;border-radius:50%;background:white">↥</button>
      </div>
      <button aria-label="お気に入り" style="position:absolute;left:666px;top:60px;width:34px;height:34px;border-radius:50%">♥</button>
    </div>
    <div id="title_feature_div" style="position:absolute;left:770px;top:100px"><span id="productTitle">Anker Prime Charger</span></div>'''
    load(page, "https://www.amazon.co.jp/dp/B0DNDXMLR7/?ref_=test", product)
    ctl = page.locator('.linktrim-amazon-page-control')
    share = page.locator('#shareIcon')
    a,b=ctl.bounding_box(),share.bounding_box()
    assert ctl.is_visible(), "Detail copy control missing"
    assert abs((a['x']+a['width'])-b['x'])<=12, (a,b)
    assert abs((a['y']+a['height']/2)-(b['y']+b['height']/2))<=3, (a,b)
    assert page.locator('.linktrim-card-portal').is_visible() is False, 'Unintended image hover copy'
    ctl.locator('button').click()
    message=page.evaluate('window.__messages[0]')
    assert message['url'].startswith('https://www.amazon.co.jp/dp/B0DNDXMLR7/')
    page.evaluate("document.querySelector('#shareIcon_feature_div').style.left = '530px'")
    page.evaluate("window.dispatchEvent(new Event('resize'))")
    a,b=ctl.bounding_box(),share.bounding_box()
    assert abs((a['x']+a['width'])-b['x'])<=12, 'Copy control did not follow dynamic Amazon layout'
    # Native CSS position tracks the share control during scrolling immediately,
    # with no JS timer and no ghost button left at a previous viewport position.
    assert ctl.evaluate("e => getComputedStyle(e).position") == "absolute"
    assert ctl.evaluate("e => e.parentElement.id") == "imageBlock"
    for scroll in (80, 170, 320, 720):
        page.evaluate("y => window.scrollTo(0, y)", scroll)
        a,b=ctl.bounding_box(),share.bounding_box()
        assert abs((a['x']+a['width'])-b['x'])<=12, (scroll,a,b)
        assert abs((a['y']+a['height']/2)-(b['y']+b['height']/2))<=3, (scroll,a,b)
    assert ctl.bounding_box()['y'] + ctl.bounding_box()['height'] < 0, 'Scrolldown should move button offscreen'
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(350)
    assert page.locator('.linktrim-amazon-page-control').count() == 1, 'Page observer must not duplicate controls'
    ctx.close()

    ctx = browser.new_context(viewport={"width":1000,"height":700})
    page = ctx.new_page()
    load(page, "https://www.amazon.co.jp/s?k=charger&page=2", '<p>Amazon search results</p>')
    ctl=page.locator('.linktrim-amazon-page-control')
    assert ctl.is_visible() and not ctl.evaluate("e => e.classList.contains('linktrim-amazon-detail-control')")
    assert abs(ctl.bounding_box()['x']+ctl.bounding_box()['width'] - 982) < 3
    ctl.locator('button').click()
    assert page.evaluate('window.__messages[0].url').endswith('/s?k=charger&page=2')
    ctx.close()

    ctx = browser.new_context(viewport={"width":1000,"height":700})
    page = ctx.new_page()
    # Real-world regression: Amazon may render its icons without the Share IDs
    # above; the original implementation incorrectly fell back to the title.
    load(page, "https://www.amazon.co.jp/dp/B0DNDXMLR7/", '''<div id="imageBlock" style="position:relative;width:760px;height:690px;float:left">
        <div style="position:absolute;left:667px;top:29px"><button aria-label="商品を送る" style="width:34px;height:34px">↥</button></div>
        <div style="position:absolute;left:713px;top:29px"><button aria-label="お気に入り" style="width:34px;height:34px">♥</button></div>
      </div>
      <div id="title_feature_div" style="position:absolute;left:775px;top:100px"><h1 id="productTitle">Anker Prime Charger</h1></div>''')
    ctl=page.locator('.linktrim-amazon-page-control')
    share=page.get_by_role('button', name='商品を送る')
    assert ctl.is_visible(), 'Product share toolbar fallback missing'
    a,b=ctl.bounding_box(),share.bounding_box()
    assert abs((a['x'] + a['width']) - b['x']) <= 12, (a,b)
    assert abs((a['y'] + a['height']/2) - (b['y'] + b['height']/2)) <= 3, (a,b)
    assert (a['x'] + a['width']) < page.locator('#productTitle').bounding_box()['x'] - 50
    # With no share controls at all, stay on the image side, not by the title.
    page.evaluate('document.querySelector("#imageBlock button").remove();document.querySelector("#imageBlock button").remove()')
    page.wait_for_timeout(350)
    assert ctl.is_visible()
    assert ctl.bounding_box()['x'] < 760 - 110
    ctx.close()
    browser.close()
print('Amazon share position browser smoke PASS')
