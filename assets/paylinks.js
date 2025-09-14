// ai_diagnosis/assets/paylinks.js
const PAY = {
  entry:     "https://buy.stripe.com/bJecN42RHdU03IPb796Zy01",
  middle:    "https://buy.stripe.com/fZu7sK3VLbLS5QXb796Zy02",
  practical: "https://buy.stripe.com/9B66oG2RH03adjpfnp6Zy03"
};

(function () {
  document.querySelectorAll(".js-paylink").forEach(a => {
    const key = a.dataset.course, url = PAY[key];
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
  });
})();
