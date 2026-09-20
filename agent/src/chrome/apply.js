import { clickElement, waitAndClick } from './clickElement.js';
import { connectCDP } from './common.js';
import { randomWait, waitForAnyElement, waitForElement, waitForElementGone, waitForElements, waitForVisibleElement } from './fundation.js';
import { navigateTo } from './navigate.js';
import { reCaptcha } from './security.js';
import { typeInput } from './typeInput.js';

const PAGE_TYPES = [
  { key: 'resume', xpath: '//h1[normalize-space()="Add a resume"]' },
  { key: 'visibility', xpath: '//h1[normalize-space()="Want to allow employers to find you on Indeed?"]' },
  { key: 'contact', xpath: '//h2[normalize-space()="Add your contact information"]' },
  { key: 'location', xpath: '//h2[normalize-space()="Add your location"]' },
  { key: 'relevant', xpath: '//h2[normalize-space()="Enter a job that shows relevant experience"]' },
  { key: 'question', xpath: '//h1[normalize-space()="Answer these questions from the employer"]' },
  { key: 'voluntary', xpath: '//h1[normalize-space()="Voluntary self identification questions from the employer"]' },
  { key: 'unqualified', xpath: '//h1[normalize-space()="It looks like you don\'t meet these employer requirements"]' },
  { key: 'review', xpath: '//h1[normalize-space()="Review your application"]' },
  { key: 'submitted', xpath: '//h1[starts-with(normalize-space(), "Your application has been submitted")]' },
];

async function pageType(cdp) {
  return waitForAnyElement(cdp, PAGE_TYPES);
}

/**
 * @returns {Promise<{x:number,y:number}|false>}
 */
async function processJobPage(cdp, pos) {
  const { root } = await cdp.DOM.getDocument();

  // click apply
  const { nodeId: applyId } = await cdp.DOM.querySelector({ nodeId: root.nodeId, selector: 'button[aria-label="Apply with Indeed"]:not([disabled])' });

  if (!applyId) {
    throw new Error(JSON.stringify({ status: 'Closed', reason: 'Apply button not found' }));
  }

  pos = await clickElement(applyId, pos, cdp, true);
  return pos;
}

/**
 * @returns {Promise<{x:number,y:number}>}
 */
async function processResumePage(cdp, pos, resumePath) {
  const { root } = await cdp.DOM.getDocument();

  // first-time applicants have no resume on file yet: instead of the
  // "Resume options" panel they see a blank "Upload a resume" radio card
  const variant = await waitForAnyElement(cdp, [
    { key: 'existing', xpath: '//button[normalize-space()="Resume options"]' },
    { key: 'fresh', xpath: '//input[@data-testid="resume-selection-file-resume-upload-radio-card-input"]' },
  ]);

  let triggerId;
  if (variant === 'existing') {
    // click resume options
    const resumeOptionsId = await waitForElement(cdp, '//button[normalize-space()="Resume options"]');
    pos = await clickElement(resumeOptionsId, pos, cdp);

    triggerId = await waitForElement(cdp, '//button[normalize-space()="Upload a different file"]');
  } else {
    // select the "Upload a resume" card to reveal the "Select file" button
    const uploadCardId = await waitForElement(cdp, '//input[@data-testid="resume-selection-file-resume-upload-radio-card-input"]');
    pos = await clickElement(uploadCardId, pos, cdp);

    triggerId = await waitForVisibleElement(cdp, '//button[@data-testid="resume-selection-file-resume-upload-radio-card-button"]');
  }

  // upload resume
  const fileChooserOpened = new Promise(resolve => cdp.once('Page.fileChooserOpened', resolve));
  pos = await clickElement(triggerId, pos, cdp);
  const { backendNodeId } = await fileChooserOpened;
  await cdp.DOM.setFileInputFiles({ backendNodeId, files: [resumePath] });

  // wait for PDF to finish rendering before clicking Continue
  await randomWait(1000,1500);
  await waitForElement(cdp, '//section[@data-testid="resume-selection-file-resume-pdf-preview"]');
  await waitForElementGone(cdp, '//div[@data-testid="resume-selection-file-resume-pdf-preview-document-loading"]');

  // click continue
  pos = await waitAndClick(cdp, '//button[normalize-space()="Continue"]', pos, { waitForLoad: true });

  return pos;
}

/**
 * @returns {Promise<{x:number,y:number}>}
 */
async function processVisibilityPage(cdp, pos) {
  const { root } = await cdp.DOM.getDocument();

  // click continue
  pos = await waitAndClick(cdp, '//button[normalize-space()="Continue"]', pos, { waitForLoad: true });

  return pos;
}

/**
 * @returns {Promise<{x:number,y:number}>}
 */
async function processContactPage(cdp, pos) {
  const { root } = await cdp.DOM.getDocument();

  // click continue
  pos = await waitAndClick(cdp, '//button[normalize-space()="Continue"]', pos, { waitForLoad: true });

  return pos;
}

/**
 * @returns {Promise<{x:number,y:number}>}
 */
async function processLocationPage(cdp, pos) {
  const { root } = await cdp.DOM.getDocument();

  // click continue
  pos = await waitAndClick(cdp, '//button[normalize-space()="Continue"]', pos, { waitForLoad: true });

  return pos;
}

/**
 * @returns {Promise<{x:number,y:number}>}
 */
async function processRelevantPage(cdp, pos) {
  const { root } = await cdp.DOM.getDocument();

  // click continue
  pos = await waitAndClick(cdp, '//button[normalize-space()="Continue"]', pos, { waitForLoad: true });

  return pos;
}


/**
 * SEARCHABLE SELECT WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processSearchableSelectQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: comboNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'div[role="combobox"][aria-haspopup="dialog"]' });
  if (!comboNodeIds || comboNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const comboId = comboNodeIds[0];
  const { attributes: comboAttrs } = await cdp.DOM.getAttributes({ nodeId: comboId });
  const testid = comboAttrs[comboAttrs.indexOf('data-testid') + 1];
  // the option <li>s share this same prefix, e.g. "input-q_country" (question
  // page) or "single-select-question" (voluntary/demographic page, which has
  // no per-field name at all)
  const prefix = testid.replace(/-select-list-select-list$/, '');

  // this combobox widget comes in two variants: an exclusive single-select
  // (li[role="option"], closes on pick) and a checkbox-style multi-select
  // (li[role="menuitemcheckbox"], stays open, toggled like a checkbox group)
  const { nodeIds: multiOptionNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'li[role="menuitemcheckbox"]' });
  const isMulti = !!multiOptionNodeIds && multiOptionNodeIds.length > 0;
  const optionRoleSelector = isMulti ? 'li[role="menuitemcheckbox"]' : 'li[role="option"]';
  const labelSelector = isMulti
    ? 'legend[id^="multi-select-question-label-multi-select-question-"]'
    : 'label[id^="single-select-question-label-single-select-question-"]';
  const errorSelector = isMulti
    ? 'div[id^="ifl-FormField-errorText-"]'
    : 'div[id^="single-select-question-error-text-single-select-question-"]';

  let labelText;
  const getLabelText = async () => {
    if (labelText === undefined) {
      const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: labelSelector });
      const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
      const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
      labelText = labelResult.value;
    }
    return labelText;
  };

  // question-page fields carry their own name ("input-q_<key>"); voluntary-page
  // fields don't, so fall back to a slug of the visible label text for a stable key
  const key = prefix.startsWith('input-q_')
    ? prefix.slice('input-q_'.length)
    : (await getLabelText()).replace(/\s*\*\s*$/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    const target = answers.get(key);

    if (isMulti) {
      // checkbox-style options: toggle each one to match the target set
      const targets = Array.isArray(target) ? target : [target];

      const readOptionStates = async () => {
        const { nodeIds: ids } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: optionRoleSelector });
        const states = new Map();
        for (const optId of ids) {
          const { attributes: optAttrs } = await cdp.DOM.getAttributes({ nodeId: optId });
          const optTestid = optAttrs[optAttrs.indexOf('data-testid') + 1];
          const value = optTestid.slice(`${prefix}-select-list-`.length);
          const checked = optAttrs[optAttrs.indexOf('aria-checked') + 1] === 'true';
          states.set(value, { optId, checked });
        }
        return states;
      };

      const states = await readOptionStates();
      const toToggle = [...states.entries()].filter(([value, { checked }]) => targets.includes(value) !== checked);

      if (toToggle.length > 0) {
        // open the dropdown and give the floating popup a moment to finish
        // positioning before clicking inside it — a coordinate sampled
        // mid-animation/reflow can land on the wrong <li> (e.g. the first
        // option in the list) instead of the intended one
        pos = await clickElement(comboId, pos, cdp);
        await randomWait(300, 600);

        const optionSelectorFor = value => `li[data-testid="${prefix}-select-list-${value}"]`;

        for (const [value] of toToggle) {
          const wantChecked = targets.includes(value);
          // re-read this option's own aria-checked after clicking to confirm
          // the click actually landed on it — a mis-click leaves it unchanged,
          // so retry once before giving up on this option
          let confirmed = false;
          for (let attempt = 0; attempt < 2 && !confirmed; attempt++) {
            // re-resolve the nodeId fresh right before every click attempt
            // instead of reusing the one captured by readOptionStates() before
            // the dropdown opened — this popup is a floating-ui portal, and
            // opening it can remount its <li> list, leaving the earlier
            // nodeId dangling (surfaces as "Could not compute box model")
            const { nodeId: freshOptId } = await cdp.DOM.querySelector({ nodeId: qId, selector: optionSelectorFor(value) });
            if (!freshOptId) {
              console.log(`[processSearchableSelectQuestion] key=${key}: option "${value}" not found in DOM on attempt ${attempt + 1}`);
              await randomWait(150, 300);
              continue;
            }
            // scroll within the popup's own scrollable list, not just the page —
            // window-level scroll() can't reach an option scrolled out of view
            // inside the popup's internal container
            await cdp.DOM.scrollIntoViewIfNeeded({ nodeId: freshOptId }).catch(() => {});
            pos = await clickElement(freshOptId, pos, cdp);
            await randomWait(150, 300);
            const { attributes: freshAttrs } = await cdp.DOM.getAttributes({ nodeId: freshOptId });
            confirmed = (freshAttrs[freshAttrs.indexOf('aria-checked') + 1] === 'true') === wantChecked;
          }
          if (!confirmed) {
            console.log(`[processSearchableSelectQuestion] key=${key}: click did not toggle option "${value}" to the expected state`);
          }
        }

        pos = await clickElement(comboId, pos, cdp);
        changed = true;

        // re-read the full option set to confirm the final DOM state actually
        // matches the target answer — Indeed's own validation below only
        // checks "is anything selected", so a mis-click landing on the wrong
        // option would otherwise be reported as successful
        const finalStates = await readOptionStates();
        const mismatched = [...finalStates.entries()].filter(([value, { checked }]) => targets.includes(value) !== checked);
        if (mismatched.length > 0) {
          console.log(`[processSearchableSelectQuestion] key=${key}: final selection does not match target answer —`, mismatched.map(([v]) => v));
          await updateAnswerCallback({ key, error: 'Selected option(s) did not match the target answer after clicking' });
          successful = false;
        }
      }
    } else {
      const optionSelector = `li[data-testid="${prefix}-select-list-${target}"]`;

      // get the target option's label (already present in the DOM) to use as the search term
      const { nodeId: preOptionId } = await cdp.DOM.querySelector({ nodeId: qId, selector: optionSelector });
      if (preOptionId) {
        const { object: preOptObj } = await cdp.DOM.resolveNode({ nodeId: preOptionId });
        const { result: preOptResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: preOptObj.objectId });
        const searchTerm = preOptResult.value.replace(/\s*\([^)]*\)\s*$/, '').trim();

        // check whether this option is already the one displayed in the (collapsed) combobox
        const { object: comboObj } = await cdp.DOM.resolveNode({ nodeId: comboId });
        const { result: comboResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: comboObj.objectId });
        const currentText = comboResult.value.replace(/\s*\([^)]*\)\s*$/, '').trim();

        if (currentText !== searchTerm) {
          // open the dropdown
          pos = await clickElement(comboId, pos, cdp);

          // type the search term to make the option appear (skip Tab: it would blur the filter input and close the popup before we can click the option)
          const { nodeId: filterId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'input[data-testid$="-select-list-filter-input"]' });
          pos = await typeInput(filterId, searchTerm, pos, cdp, { pressTab: false });

          // wait for the filtered option to appear, then select it
          const optionId = await waitForElement(cdp, `//li[@data-testid="${prefix}-select-list-${target}"]`);
          pos = await clickElement(optionId, pos, cdp);
          changed = true;
        }
      }
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: errorSelector });
    const { object: errObj } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result: errResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: errObj.objectId });
    if (errResult.value) {
      await updateAnswerCallback({ key, error: errResult.value });
      successful = false;
    }
  } else {
    // get question
    const question = await getLabelText();

    // get options (already present in the DOM, no need to open the dropdown)
    const { nodeIds: optionNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: optionRoleSelector });
    const options = await Promise.all(optionNodeIds.map(async optId => {
      const { attributes: optAttrs } = await cdp.DOM.getAttributes({ nodeId: optId });
      const optTestid = optAttrs[optAttrs.indexOf('data-testid') + 1];
      const value = optTestid.slice(`${prefix}-select-list-`.length);
      const { object: optObj } = await cdp.DOM.resolveNode({ nodeId: optId });
      const { result: optResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: optObj.objectId });
      return { value, label: optResult.value };
    }));
    await createAnswerCallback({ key, question, type: isMulti ? 'multi-select' : 'single-select', options });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * TEXT WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processTextQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: textNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'input[type="text"][id^="text-question-input-"]' });
  if (!textNodeIds || textNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const inputId = textNodeIds[0];
  const { attributes: inAttrs } = await cdp.DOM.getAttributes({ nodeId: inputId });
  const key = inAttrs[inAttrs.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    const { object: inputObj } = await cdp.DOM.resolveNode({ nodeId: inputId });
    const { result: currentResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.value}', objectId: inputObj.objectId });
    if (currentResult.value !== target) {
      pos = await typeInput(inputId, target, pos, cdp);
      changed = true;
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="text-question-error-text-"]' });
    const { object } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: object.objectId });
    if (result.value) {
      await updateAnswerCallback({ key, error: result.value });
      successful = false;
    }
  }
  else {
    // get question
    const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'label[for^="text-question-input-"]' });
    const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
    const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
    const question = labelResult.value;

    await createAnswerCallback({ key, question, type: 'text' });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * CHECKBOX WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processCheckboxQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: checkboxNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'input[type="checkbox"]' });
  if (!checkboxNodeIds || checkboxNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const { attributes } = await cdp.DOM.getAttributes({ nodeId: checkboxNodeIds[0] });
  const key = attributes[attributes.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    for (const cbId of checkboxNodeIds) {
      const { attributes: cbAttrs } = await cdp.DOM.getAttributes({ nodeId: cbId });
      const value = cbAttrs[cbAttrs.indexOf('value') + 1];
      const checked = cbAttrs.indexOf('checked') !== -1;
      if (target.includes(value)) {
        if (!checked) { pos = await clickElement(cbId, pos, cdp); changed = true; }
      } else {
        if (checked) { pos = await clickElement(cbId, pos, cdp); changed = true; }
      }
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="ifl-FormField-errorText-"]' });
    const { object } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: object.objectId });
    if (result.value) {
      await updateAnswerCallback({ key, error: result.value });
      successful = false;
    }
  } else {
    // get question
    const { nodeId: legendId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'legend[id^="multi-select-question-label-multi-select-question-"]' });
    const { object: legendObj } = await cdp.DOM.resolveNode({ nodeId: legendId });
    const { result: legendResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: legendObj.objectId });
    const question = legendResult.value;

    // get options
    const options = await Promise.all(checkboxNodeIds.map(async cbId => {
      const { attributes: cbAttrs } = await cdp.DOM.getAttributes({ nodeId: cbId });
      const value = cbAttrs[cbAttrs.indexOf('value') + 1];
      const { object } = await cdp.DOM.resolveNode({ nodeId: cbId });
      const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.parentNode.innerText}', objectId: object.objectId });
      return { value, label: result.value };
    }));
    await createAnswerCallback({ key, question, type: 'multi-select', options });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * RADIO WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processRadioQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: radioNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'input[type="radio"]' });
  if (!radioNodeIds || radioNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const { attributes } = await cdp.DOM.getAttributes({ nodeId: radioNodeIds[0] });
  const key = attributes[attributes.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    const match = (await Promise.all(
      radioNodeIds.map(async id => {
        const { attributes: rdAttrs } = await cdp.DOM.getAttributes({ nodeId: id });
        const value = rdAttrs[rdAttrs.indexOf('value') + 1];
        const checked = rdAttrs.indexOf('checked') !== -1;
        return value === target ? { id, checked } : null;
      })
    )).find(m => m != null);
    if (match && !match.checked) { pos = await clickElement(match.id, pos, cdp); changed = true; }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="single-select-question-error-text-single-select-question-"]' });
    const { object } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: object.objectId });
    if (result.value) {
      await updateAnswerCallback({ key, error: result.value });
      successful = false;
    }
  } else {
    // get question
    const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'legend[id^="single-select-question-label-single-select-question-"]' });
    const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
    const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
    const question = labelResult.value;

    // get options
    const options = await Promise.all(radioNodeIds.map(async rdId => {
      const { attributes: rdAttrs } = await cdp.DOM.getAttributes({ nodeId: rdId });
      const value = rdAttrs[rdAttrs.indexOf('value') + 1];
      const { object } = await cdp.DOM.resolveNode({ nodeId: rdId });
      const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.parentNode.innerText}', objectId: object.objectId });
      return { value, label: result.value };
    }));
    await createAnswerCallback({ key, question, type: 'single-select', options });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * SELECT WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processSelectQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: selectNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'select' });
  if (!selectNodeIds || selectNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const selectId = selectNodeIds[0];
  const { attributes } = await cdp.DOM.getAttributes({ nodeId: selectId });
  const key = attributes[attributes.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    const { object: selObj } = await cdp.DOM.resolveNode({ nodeId: selectId });
    const { result: currentResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.value}', objectId: selObj.objectId });
    if (currentResult.value !== target) {
      pos = await clickElement(selectId, pos, cdp);
      await cdp.Runtime.callFunctionOn({
        functionDeclaration: 'function(v){ this.value = v; this.dispatchEvent(new Event("input", { bubbles: true })); this.dispatchEvent(new Event("change", { bubbles: true })); }',
        objectId: selObj.objectId,
        arguments: [{ value: target }]
      });
      changed = true;
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="single-select-question-error-text-single-select-question-"]' });
    const { object: errObj } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result: errResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: errObj.objectId });
    if (errResult.value) {
      await updateAnswerCallback({ key, error: errResult.value });
      successful = false;
    }
  } else {
    // get question
    const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'label[id^="single-select-question-label-single-select-question-"]' });
    const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
    const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
    const question = labelResult.value;

    // get options
    const { nodeIds: optionNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: selectId, selector: 'option' });
    const options = await Promise.all(optionNodeIds.map(async optId => {
      const { attributes: optAttrs } = await cdp.DOM.getAttributes({ nodeId: optId });
      const value = optAttrs[optAttrs.indexOf('value') + 1];
      const { object: optObj } = await cdp.DOM.resolveNode({ nodeId: optId });
      const { result: optResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: optObj.objectId });
      return { value, label: optResult.value };
    }));
    await createAnswerCallback({ key, question, type: 'single-select', options });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * NUMBER WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processNumberQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: numberNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'input[type="text"][id^="number-input-"]' });
  if (!numberNodeIds || numberNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const inputId = numberNodeIds[0];
  const { attributes: inAttrs } = await cdp.DOM.getAttributes({ nodeId: inputId });
  const key = inAttrs[inAttrs.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    const { object: inputObj } = await cdp.DOM.resolveNode({ nodeId: inputId });
    const { result: currentResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.value}', objectId: inputObj.objectId });
    if (currentResult.value !== target) {
      pos = await typeInput(inputId, target, pos, cdp);
      changed = true;
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="number-question-error-text-"]' });
    const { object } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: object.objectId });
    if (result.value) {
      await updateAnswerCallback({ key, error: result.value });
      successful = false;
    }
  } else {
    // get question
    const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'label[for^="number-input-"]' });
    const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
    const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
    const question = labelResult.value;

    // get min and max
    const min = inAttrs.indexOf('min') !== -1 ? inAttrs[inAttrs.indexOf('min') + 1] : undefined;
    const max = inAttrs.indexOf('max') !== -1 ? inAttrs[inAttrs.indexOf('max') + 1] : undefined;

    await createAnswerCallback({ key, question, type: 'number', ...(min !== undefined && { min }), ...(max !== undefined && { max }) });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * TEXTAREA WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processTextareaQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: textareaNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'textarea' });
  if (!textareaNodeIds || textareaNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const textareaId = textareaNodeIds[0];
  const { attributes } = await cdp.DOM.getAttributes({ nodeId: textareaId });
  const key = attributes[attributes.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    const { object: textareaObj } = await cdp.DOM.resolveNode({ nodeId: textareaId });
    const { result: currentResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.value}', objectId: textareaObj.objectId });
    if (currentResult.value !== target) {
      pos = await typeInput(textareaId, target, pos, cdp);
      changed = true;
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="rich-text-question-error-text-"]' });
    const { object } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: object.objectId });
    if (result.value) {
      await updateAnswerCallback({ key, error: result.value });
      successful = false;
    }
  } else {
    // get question
    const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'label[for^="rich-text-question-input-"]' });
    const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
    const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
    const question = labelResult.value;

    // get length
    const { nodeIds: spanIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'span[dir="ltr"]' });
    let length;
    if (spanIds && spanIds.length > 0) {
      const { object: spanObj } = await cdp.DOM.resolveNode({ nodeId: spanIds[0] });
      const { result: spanResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: spanObj.objectId });
      length = parseInt(spanResult.value.split('/')[1].trim(), 10);
    }

    await createAnswerCallback({ key, question, type: 'text', ...(length !== undefined && { length }) });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * DATE WIDGET
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean, key:string, mutated:boolean}|null>}
 */
async function processDateQuestion(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys) {
  const { nodeIds: dateNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'input[id^="date-question-input-"]' });
  if (!dateNodeIds || dateNodeIds.length === 0) return null;

  let successful = true;

  // get key
  const inputId = dateNodeIds[0];
  const { attributes: inAttrs } = await cdp.DOM.getAttributes({ nodeId: inputId });
  const key = inAttrs[inAttrs.indexOf('name') + 1].replace(/^q_/, '');

  if (handledKeys.has(key)) {
    return { pos, successful: true, key, mutated: false };
  }

  let changed = false;

  if (answers.has(key)) {
    // set value
    const target = answers.get(key);
    const { object: inputObj } = await cdp.DOM.resolveNode({ nodeId: inputId });
    const { result: currentResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.value}', objectId: inputObj.objectId });
    if (currentResult.value !== target) {
      pos = await typeInput(inputId, target, pos, cdp);
      changed = true;
    }

    // check error
    const { nodeId: errId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'div[id^="date-question-error-text-"]' });
    const { object } = await cdp.DOM.resolveNode({ nodeId: errId });
    const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: object.objectId });
    if (result.value) {
      await updateAnswerCallback({ key, error: result.value });
      successful = false;
    }
  } else {
    // get question
    const { nodeId: labelId } = await cdp.DOM.querySelector({ nodeId: qId, selector: 'label[for^="date-question-input-"]' });
    const { object: labelObj } = await cdp.DOM.resolveNode({ nodeId: labelId });
    const { result: labelResult } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText}', objectId: labelObj.objectId });
    const question = labelResult.value;

    // get format
    const format = inAttrs[inAttrs.indexOf('placeholder') + 1];

    await createAnswerCallback({ key, question, type: 'date', format });
    successful = false;
  }

  return { pos, successful, key, mutated: changed };
}

/**
 * INFORMATION WIDGET (no answer required)
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean}|null>}
 */
async function processInformationQuestion(cdp, qId, pos) {
  const { nodeIds: infoNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'div[data-testid="information-question"]' });
  if (!infoNodeIds || infoNodeIds.length === 0) return null;

  return { pos, successful: true };
}

/**
 * FILE UPLOAD WIDGET (skipped, like the information widget — no answer required)
 * @returns {Promise<{pos:{x:number,y:number}, successful:boolean}|null>}
 */
async function processFileUploadQuestion(cdp, qId, pos) {
  const { nodeIds: uploadNodeIds } = await cdp.DOM.querySelectorAll({ nodeId: qId, selector: 'div[id^="file-upload-question-helper-text-"]' });
  if (!uploadNodeIds || uploadNodeIds.length === 0) return null;

  return { pos, successful: true };
}

const QUESTION_WIDGETS = [
  processSearchableSelectQuestion,
  processTextQuestion,
  processCheckboxQuestion,
  processRadioQuestion,
  processSelectQuestion,
  processNumberQuestion,
  processTextareaQuestion,
  processDateQuestion,
  processInformationQuestion,
  processFileUploadQuestion,
];

/**
 * @returns {Promise<{x:number,y:number}|false>}
 */
async function processQuestionPage(cdp, pos, jobUrl, answers, createAnswerCallback, updateAnswerCallback) {
  const handledKeys = new Set();
  let successful = true;

  for (;;) {
    const qNodeIds = await waitForElements(cdp, '//div[starts-with(@id, "q_") and not(translate(substring-after(@id, "q_"), "0123456789", ""))]');
    let mutated = false;

    for (const qId of qNodeIds) {
      let handled = false;
      for (const widget of QUESTION_WIDGETS) {
        const result = await widget(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys);
        if (result) {
          pos = result.pos;
          if (result.key) handledKeys.add(result.key);
          if (!result.successful) successful = false;
          if (result.mutated) mutated = true;
          handled = true;
          break;
        }
      }

      if (!handled) {
        throw new Error(JSON.stringify({ status: 'Aborted', reason: 'Unknown question type' }));
      }

      // a widget just wrote a value into the page — the DOM may have re-rendered,
      // so the rest of qNodeIds could be stale; stop and re-collect from scratch
      if (mutated) break;
    }

    // walked the whole current list without writing anything new — done
    if (!mutated) break;
  }

  if (!successful) {
    return false;
  }

  pos = await waitAndClick(cdp, '//button[normalize-space()="Continue"]', pos, { waitForLoad: true });

  return pos;
}

/**
 * @returns {Promise<{x:number,y:number}|false>}
 */
async function processVoluntaryPage(cdp, pos, jobUrl, answers, createAnswerCallback, updateAnswerCallback) {
  const handledKeys = new Set();
  let successful = true;

  for (;;) {
    const qNodeIds = await waitForElements(cdp, '//div[contains(@class, "ia-Questions-item")]');
    let mutated = false;

    for (const qId of qNodeIds) {
      let handled = false;
      for (const widget of QUESTION_WIDGETS) {
        const result = await widget(cdp, qId, pos, answers, createAnswerCallback, updateAnswerCallback, handledKeys);
        if (result) {
          pos = result.pos;
          if (result.key) handledKeys.add(result.key);
          if (!result.successful) successful = false;
          if (result.mutated) mutated = true;
          handled = true;
          break;
        }
      }

      if (!handled) {
        throw new Error(JSON.stringify({ status: 'Aborted', reason: 'Unknown question type' }));
      }

      // a widget just wrote a value into the page — the DOM may have re-rendered,
      // so the rest of qNodeIds could be stale; stop and re-collect from scratch
      if (mutated) break;
    }

    // walked the whole current list without writing anything new — done
    if (!mutated) break;
  }

  if (!successful) {
    return false;
  }

  pos = await waitAndClick(cdp, '//button[normalize-space()="Review your application"]', pos, { waitForLoad: true });

  return pos;
}

/**
 * @returns {Promise<false>}
 */
async function processUnqualifiedPage(cdp) {
  const { root } = await cdp.DOM.getDocument();

  const nodeId = await waitForElement(cdp, '//div[contains(@class, "mosaic-provider-module-apply-questions-36r5ue")]');
  const { object } = await cdp.DOM.resolveNode({ nodeId });
  const { result } = await cdp.Runtime.callFunctionOn({ functionDeclaration: 'function(){return this.innerText.trim()}', objectId: object.objectId });
  throw new Error(JSON.stringify({ status: 'Closed', reason: result.value }));
}

/**
 * @returns {Promise<{x:number,y:number}>}
 */
async function processReviewPage(cdp, pos, resumePath, captchaCallback) {
  const { root } = await cdp.DOM.getDocument();

  if (resumePath) {
    const iframeNodeId = await waitForElement(cdp, '//iframe[@title="Application preview"]');
    const { node: iframeNode } = await cdp.DOM.describeNode({ nodeId: iframeNodeId });
    const { nodeId: editId } = await cdp.DOM.querySelector({ nodeId: iframeNode.contentDocument.nodeId, selector: 'button[aria-label="Edit resume"]' });
    if (editId) {
      pos = await clickElement(editId, pos, cdp, true);
      pos = await processResumePage(cdp, pos, resumePath);
    }
  }

  pos = await reCaptcha(pos, cdp, captchaCallback);

  const { root: freshRoot } = await cdp.DOM.getDocument();
  const { nodeId: submitId } = await cdp.DOM.querySelector({ nodeId: freshRoot.nodeId, selector: 'button[name="submit-application"]' });
  pos = await clickElement(submitId, pos, cdp);
  return pos;
}

/**
 * @returns {Promise<false>}
 */
async function processSubmittedPage(cdp) {
  return false;
}

/**
 * @returns {Promise<{status:string, reason?:string}>}
 */
async function apply(jobUrl, resumePath, answers, createAnswerCallback, updateAnswerCallback, captchaCallback) {
  const cdp = await connectCDP();
  await Promise.all([cdp.Page.enable(), cdp.DOM.enable(), cdp.Runtime.enable(), cdp.Network.enable()]);
  await cdp.Page.setInterceptFileChooserDialog({ enabled: true });

  try {
    let pos = await navigateTo(jobUrl, cdp);

    pos = await processJobPage(cdp, pos);

    let resumeUploaded, submitted = false;

    while (pos) {
      const type = await pageType(cdp);
      if (type === 'resume') {
        pos = await processResumePage(cdp, pos, resumePath);
        resumeUploaded = true;
      } else if (type === 'visibility') {
        pos = await processVisibilityPage(cdp, pos);
      } else if (type === 'contact') {
        pos = await processContactPage(cdp, pos);
      } else if (type === 'location') {
        pos = await processLocationPage(cdp, pos);
      } else if (type === 'relevant') {
        pos = await processRelevantPage(cdp, pos);
      } else if (type === 'question') {
        pos = await processQuestionPage(cdp, pos, jobUrl, answers, createAnswerCallback, updateAnswerCallback);
      } else if (type === 'voluntary') {
        pos = await processVoluntaryPage(cdp, pos, jobUrl, answers, createAnswerCallback, updateAnswerCallback);
      } else if (type === 'unqualified') {
        pos = await processUnqualifiedPage(cdp);
      } else if (type === 'review') {
        pos = await processReviewPage(cdp, pos, resumeUploaded ? null : resumePath, captchaCallback);
      } else if (type === 'submitted') {
        pos = await processSubmittedPage(cdp);
        submitted = true;
      }
    }
    return submitted ? { status: 'Applied' } : { status: 'Processing' };
  } catch (err) {
    try {
      return JSON.parse(err.message);
    } catch (e) {
      return { status: 'Aborted', reason: err.message };
    }
  }
  finally {
    await cdp.Page.setInterceptFileChooserDialog({ enabled: false });
    cdp.Page.javascriptDialogOpening()
      .then(() => cdp.Page.handleJavaScriptDialog({ accept: true }))
      .catch(() => { });
    await navigateTo('about:blank', cdp);
    await cdp.close();
  }
}
export { apply };
