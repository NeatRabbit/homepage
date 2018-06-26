(function() {
    var lang = localStorage.getItem('lang');
    var langList = {'ko': true, 'en': true};
    var documentLang = document.documentElement.lang;

    if (!lang) {
        lang = navigator.language || navigator.userLanguage;
        lang = lang.substr(0, 2);
        localStorage.setItem('lang', lang);
    }

    var langChange = function(lang) {
        var defaultLang = 'ko';
        var documentLang = document.documentElement.lang;
        var replaceReg = new RegExp('^\/'+documentLang, 'i');
        var pathname = location.pathname.replace(replaceReg, '');

        if (lang === defaultLang) {
            pathname = pathname;
        } else {
            pathname = '/'+lang+pathname;
        }

        return pathname;
    }

    if (langList[lang] && documentLang !== lang) {
        location.pathname = langChange(lang);
    }

    var clickLangLink = function (e) {
        e.preventDefault();
        var clickLang = this.getAttribute('data-lang');
        localStorage.setItem('lang', clickLang);
        location.pathname = langChange(clickLang);
    }

    var langLink = document.querySelectorAll('.lang_link');
    var imax = langLink.length;

    for (var i = 0; i < imax; i++) {
        langLink[i].addEventListener('click', clickLangLink);
    }
}())