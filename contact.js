// 문의 양식(문의하기 페이지 contact.html·en/contact.html) — api.beardworks.io/contact로 보낸다(beardworks ops Worker, ops/src/contact.js).
// Turnstile 사이트 키가 비어 있거나 OPEN이 거짓이면 양식을 숨기고 메일 주소 안내만 남긴다(키는 Cloudflare 대시보드 → Turnstile).
(function () {
  "use strict";
  var SITEKEY = "0x4AAAAAAGQeV8vKza3nQvqs";
  var ENDPOINT = "https://api.beardworks.io/contact";
  // OPEN = false인 동안은 주소 끝이 #contact-test일 때만 양식이 보인다(공개 전 실제 시험용).
  var OPEN = false;
  var form = document.getElementById("contact-form");
  if (!form || !SITEKEY || !(OPEN || location.hash === "#contact-test")) return;
  var lang = document.documentElement.lang === "en" ? "en" : "ko";
  var T = {
    ko: {
      sending: "보내는 중…",
      sent: "보냈습니다. 적어 주신 이메일로 답장드리겠습니다.",
      bot: "봇 확인이 끝나지 않았습니다. 잠시 뒤 다시 보내 주세요.",
      rate: "잠시 뒤에 다시 보내 주세요.",
      field: "칸을 확인해 주세요 — 이름, 올바른 이메일, 내용(열 글자 이상)이 필요합니다.",
      fail: "보내지 못했습니다. 아래 메일 주소로 직접 보내 주세요.",
    },
    en: {
      sending: "Sending…",
      sent: "Sent. We will reply to the email address you gave.",
      bot: "The bot check has not finished yet. Please try again in a moment.",
      rate: "Please try again in a minute.",
      field: "Please check the form — a name, a valid email and a message of at least ten characters are needed.",
      fail: "Your message could not be sent. Please email us directly at the address below.",
    },
  }[lang];
  var status = document.getElementById("contact-status");
  var button = form.querySelector("button[type=submit]");
  var widget = null;

  form.hidden = false;
  window.bwTurnstileReady = function () {
    widget = window.turnstile.render("#contact-turnstile", { sitekey: SITEKEY, theme: "dark", language: lang, size: "flexible" });
  };
  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=bwTurnstileReady";
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);

  function say(text, ok) {
    status.textContent = text;
    status.className = "form-status" + (ok ? " ok" : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new URLSearchParams(new FormData(form));
    data.set("lang", lang);
    if (!data.get("cf-turnstile-response")) return say(T.bot + " (no-token)");
    button.disabled = true;
    say(T.sending);
    fetch(ENDPOINT, { method: "POST", body: data })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        if (j.ok) {
          form.reset();
          say(T.sent, true);
        } else {
          var code = j.codes && j.codes.length ? " (" + j.codes.join(", ") + ")" : "";
          say((j.error === "bot" ? T.bot : j.error === "rate" ? T.rate : ["kind", "name", "email", "message"].indexOf(j.error) >= 0 ? T.field : T.fail) + code);
        }
      })
      .catch(function () { say(T.fail); })
      .then(function () {
        button.disabled = false;
        if (widget !== null && window.turnstile) window.turnstile.reset(widget);
      });
  });
})();
