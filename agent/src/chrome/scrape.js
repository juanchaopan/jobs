import { connectCDP, normalizeUrl } from './common.js';
import { navigateTo } from './navigate.js';
import { typeInput } from './typeInput.js';
import { clickElement } from './clickElement.js';

async function processSubscribe(cdp, pos, root) {
  // find the element with text "I want to receive the latest job alert"
  const { searchId, resultCount } = await cdp.DOM.performSearch({ query: '//h3[starts-with(text(), "I want to receive the latest job alert")]' });
  const nodeIds = resultCount > 0 ? (await cdp.DOM.getSearchResults({ searchId, fromIndex: 0, toIndex: resultCount })).nodeIds : [];
  await cdp.DOM.discardSearchResults({ searchId });

  if (nodeIds.length > 0) {
    const subscribeNodeId = nodeIds[0];
    // find the first button in the parent element and click it
    const { nodeId: parentId } = await cdp.DOM.getParentNode({ nodeId: subscribeNodeId });
    const { nodeIds: buttonIds } = await cdp.DOM.querySelectorAll({ nodeId: parentId, selector: 'button' });
    if (buttonIds.length > 0) {
      pos = await clickElement(buttonIds[0], pos, cdp, true);
    }
  }
  return pos;
}

async function processHref(key, href, jobCdp, createCallback) {
  const url = normalizeUrl(href);
  await navigateTo(url, jobCdp);

  const { result: actualUrlResult } = await jobCdp.Runtime.evaluate({ expression: 'location.href', returnByValue: true });
  const actualUrl = actualUrlResult.value;

  const { root: jobRoot } = await jobCdp.DOM.getDocument();

  const { nodeId: companyId } = await jobCdp.DOM.querySelector({ nodeId: jobRoot.nodeId, selector: 'div[data-company-name="true"]' });
  const { object: companyObject } = await jobCdp.DOM.resolveNode({ nodeId: companyId });
  const { result: companyResult } = await jobCdp.Runtime.callFunctionOn({
    objectId: companyObject.objectId,
    functionDeclaration: 'function(){ return (this.innerText || "").trim(); }',
    returnByValue: true
  });
  const company = companyResult.value;

  const { nodeId: titleSpanId } = await jobCdp.DOM.querySelector({ nodeId: jobRoot.nodeId, selector: 'h1.jobsearch-JobInfoHeader-title span' });
  const { object: titleObject } = await jobCdp.DOM.resolveNode({ nodeId: titleSpanId });
  const { result: titleResult } = await jobCdp.Runtime.callFunctionOn({
    objectId: titleObject.objectId,
    functionDeclaration: 'function(){ return (this.innerText || "").trim(); }',
    returnByValue: true
  });
  const title = titleResult.value;

  const { nodeId: descriptionId } = await jobCdp.DOM.querySelector({ nodeId: jobRoot.nodeId, selector: 'div#jobDescriptionText' });
  const { object: descriptionObject } = await jobCdp.DOM.resolveNode({ nodeId: descriptionId });
  const { result: descriptionResult } = await jobCdp.Runtime.callFunctionOn({
    objectId: descriptionObject.objectId,
    functionDeclaration: 'function(){ return (this.innerHTML || "").trim(); }',
    returnByValue: true
  });
  const description = descriptionResult.value;

  await createCallback({ key, url: actualUrl, company, title, description });
}

async function processPage(cdp, pos, findCallback, createCallback) {
  const { root } = await cdp.DOM.getDocument();
  const { nodeIds: linkIds } = await cdp.DOM.querySelectorAll({ nodeId: root.nodeId, selector: '[class*="jobTitle"] a' });
  const linkObjects = await Promise.all(linkIds.map(nodeId => cdp.DOM.resolveNode({ nodeId })));
  const linkKeyResults = await Promise.all(linkObjects.map(({ object }) => cdp.Runtime.callFunctionOn({ objectId: object.objectId, functionDeclaration: 'function(){ return this.id.match(/^(?:sj_|job_|vj_)?([a-zA-Z0-9]+)/)[1] }', returnByValue: true })));
  const linkKeys = linkKeyResults.map(({ result }) => result.value);
  const linkHrefResults = await Promise.all(linkObjects.map(({ object }) => cdp.Runtime.callFunctionOn({ objectId: object.objectId, functionDeclaration: 'function(){ return this.href }', returnByValue: true })));
  const linkHrefs = linkHrefResults.map(({ result }) => result.value)
  const linkKeyHrefPairs = linkKeys.map((key, index) => ({ key, href: linkHrefs[index] }));
  const filtered = linkKeyHrefPairs.filter(p => p.href.includes('/pagead/') || p.href.includes('/rc/clk?') || p.href.includes('/company/'));

  const { targetId } = await cdp.Target.createTarget({ url: 'about:blank' });
  const jobCdp = await connectCDP({ target: targetId });
  await Promise.all([jobCdp.Page.enable(), jobCdp.DOM.enable(), jobCdp.Runtime.enable(), jobCdp.Network.enable()]);

  for (const { key, href } of filtered) {
    if (! await findCallback(key)) {
      await processHref(key, href, jobCdp, createCallback).catch(() => {
        console.log('Can\'t process job key:', key);
      });
    }
  }

  await cdp.Target.closeTarget({ targetId }).catch(() => { });

  const { nodeId: nextPageId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'a[aria-label="Next page"]' });
  if (!nextPageId) {
    return false;
  }

  pos = await processSubscribe(cdp, pos, root);

  pos = await clickElement(nextPageId, pos, cdp, true);
  return pos;
}

/**
 * Scrapes Indeed job listing URLs for a given search query and writes them to a file.
 * @param {string} jobTitle - The job search query (e.g. "AI Engineer").
 * @param {string} location - The job location (e.g. "North York, ON").
 * @param {function} findCallback - Callback function to check if a job URL already exists.
 * @param {function} createCallback - Callback function to handle each discovered job URL.
 * @returns {Promise<void>}
 */
async function scrape(jobTitle, location, findCallback, createCallback) {
  const cdp = await connectCDP();
  await Promise.all([cdp.Page.enable(), cdp.DOM.enable(), cdp.Runtime.enable(), cdp.Network.enable()]);

  let pos;

  {
    pos = await navigateTo('https://ca.indeed.com', cdp);

    const { root } = await cdp.DOM.getDocument();
    const { nodeId: whatId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'input#text-input-what' });
    pos = await typeInput(whatId, jobTitle, pos, cdp);
    const { nodeId: whereId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'input#text-input-where' });
    pos = await typeInput(whereId, location, pos, cdp);
    const { nodeId: submitId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'button[type="submit"]' });
    pos = await clickElement(submitId, pos, cdp, true);
  }
  {
    const { root } = await cdp.DOM.getDocument();
    const { nodeId: ageId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'button#fromAge_filter_button' });
    pos = await clickElement(ageId, pos, cdp);
    const { nodeId: last7DaysId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'li[aria-label="Last 7 days"]' });
    pos = await clickElement(last7DaysId, pos, cdp);
    const { searchId, resultCount } = await cdp.DOM.performSearch({ query: '//button[normalize-space()="Update"]' });
    const { nodeIds: [updateId] } = await cdp.DOM.getSearchResults({ searchId, fromIndex: 0, toIndex: resultCount });
    await cdp.DOM.discardSearchResults({ searchId });
    pos = await clickElement(updateId, pos, cdp, true);
  }
  {
    const { root } = await cdp.DOM.getDocument();
    const { nodeId: sortId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'span#dateLabel' });
    pos = await clickElement(sortId, pos, cdp, true);
  }
  {
    while (pos) {
      pos = await processPage(cdp, pos, findCallback, createCallback);
    }
  }

  await cdp.close();
}

export { scrape };