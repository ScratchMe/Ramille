// Chargeur de repli pour les cartes et kits : si le bundle compilé (_ds_bundle.js) n'a pas encore
// exposé le namespace, on transpile les .jsx sources dans l'ordre des dépendances et on expose
// window.Ramille. Ne remplace pas le bundle ; le complète quand le projet n'est pas encore compilé.
(function () {
  var ORDER = [
    'core/ThemedText', 'core/Button', 'core/TextLink', 'core/MessageInline', 'core/OnboardingDots',
    'forms/Chip', 'forms/ChoiceRow', 'forms/ModeListItem', 'forms/PrecisionMode', 'forms/NumericField', 'forms/TextField', 'forms/GoogleButton',
    'mascotte/Mascot', 'mascotte/RamilleDit', 'mascotte/CalculEnCours', 'mascotte/EcranLancement',
    'navigation/CompteBouton', 'navigation/BandeHaute', 'navigation/OngletIcone', 'navigation/BarreOnglets', 'navigation/ProgressHeader', 'navigation/StepShell',
    'plan/CheckinCard', 'plan/ActionCard', 'plan/ActionCommitment', 'plan/FeuilleRappels',
    'compte/ChoixDeRappel', 'compte/MonCompte',
  ];
  // Les .jsx servis peuvent arriver déjà transpilés (runtime automatique) : on fournit _jsx/_jsxs/_Fragment.
  var SHIM = "var _Fragment = React.Fragment; function _jsx(t, p, k) { var q = Object.assign({}, p); if (k !== undefined) q.key = k; var c = q.children; delete q.children; return c === undefined ? React.createElement(t, q) : Array.isArray(c) ? React.createElement.apply(null, [t, q].concat(c)) : React.createElement(t, q, c); } var _jsxs = _jsx; var _jsxDEV = _jsx; var module = { exports: {} }; var exports = module.exports; var require = function (n) { return n === 'react' ? React : n === 'react-dom' ? ReactDOM : { jsx: _jsx, jsxs: _jsxs, jsxDEV: _jsx, Fragment: _Fragment }; };\n";
  var script = document.currentScript;
  var base = script.src.replace(/loader\.js.*$/, '');
  function existing() {
    if (window.Ramille && window.Ramille.Button) return window.Ramille;
    var keys = Object.keys(window);
    for (var i = 0; i < keys.length; i++) {
      try {
        var v = window[keys[i]];
        if (v && typeof v === 'object' && !(v instanceof Window) && v.Button && v.Mascot && v.ThemedText) return v;
      } catch (e) { /* frame cross-origine */ }
    }
    return null;
  }
  // Exécute un fichier .jsx de démonstration (carte, kit) une fois le namespace prêt.
  window.RamilleRun = function (url) {
    return window.RamilleReady.then(function (ns) {
      return fetch(new URL(url, document.baseURI).href).then(function (r) { if (!r.ok) throw new Error('fetch ' + url + ' ' + r.status); return r.text(); }).then(function (src) {
        var code = Babel.transform(src, { presets: ['react'], sourceType: 'script' }).code;
        var fn = new Function('React', 'ReactDOM', 'NS', 'with (NS) { ' + SHIM + code + ' }');
        return fn(window.React, window.ReactDOM, ns);
      });
    }).catch(function (e) { console.error('RamilleRun ' + url + ': ' + (e && e.message ? e.message : String(e))); });
  };
  window.RamilleReady = new Promise(function (resolve) {
    function go() {
            var ns = existing();
      if (ns) { window.Ramille = ns; return resolve(ns); }
      ns = {};
      var chain = Promise.resolve();
      ORDER.forEach(function (p) {
        chain = chain.then(function () {
          return fetch(base + p + '.jsx').then(function (r) { if (!r.ok) throw new Error('fetch ' + p + ' ' + r.status); return r.text(); }).then(function (src) {
            var names = [];
            var strip = function () { return { visitor: {
              ImportDeclaration: function (path) { path.remove(); },
              ExportNamedDeclaration: function (path) { if (path.node.declaration) path.replaceWith(path.node.declaration); else path.remove(); },
              ExportDefaultDeclaration: function (path) { path.replaceWith(path.node.declaration); },
              FunctionDeclaration: function (path) { if (path.parent.type === 'Program' && path.node.id) names.push(path.node.id.name); },
            } }; };
            var code = Babel.transform(src, { presets: ['react'], plugins: [strip], sourceType: 'module' }).code + '\nreturn {' + names.join(',') + '};';
            var fn = new Function('React', 'ReactDOM', 'NS', 'with (NS) { ' + SHIM + code + ' }');
            try { Object.assign(ns, fn(window.React, window.ReactDOM, ns)); } catch (e) { throw new Error(p + ': ' + e.message); }
          });
        });
      });
      chain.then(function () { window.Ramille = ns; resolve(ns); }).catch(function (e) { console.error('Ramille loader: ' + (e && e.message ? e.message : String(e))); resolve(ns); });
    }
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  });
})();
