const prefixes = [
    // English Titles
    'mr', 'master', 'mister', 'mrs', 'ms', 'miss', 'dr', 'doctor', 'prof', 'professor', 'rev', 'reverend',
    'fr', 'father', 'sr', 'sister', 'brother', 'sir', 'madam', 'dame', 'lord', 'lady', 'hon', 'honorable',

    // European Academic Titles
    'ing', 'dipl-ing', 'mgr', 'mudr', 'judr', 'rndr', 'phdr', 'thdr', 'paeddr', 'pharmdr', 'csc', 'drsc',
    'doc', 'prof', 'dr', 'drhc', 'mag', 'lic', 'dr-rer-nat', 'dr-rer-pol', 'dr-med', 'dr-med-vet', 'dr-theol',
    'dr-iur', 'dr-techn', 'dipl-kfm', 'dipl-arch', 'ing-arch',

    // French Titles
    'monsieur', 'mme', 'madame', 'mlle', 'mademoiselle', 'docteur', 'professeur',

    // German Titles
    'herr', 'frau', 'fräulein', 'doktor', 'professor',

    // Spanish Titles
    'sr', 'señor', 'sra', 'señora', 'srta', 'señorita', 'don', 'doña', 'doctor', 'profesor',

    // Italian Titles
    'sig', 'signore', 'sigra', 'signora', 'signorina', 'dott', 'dottore', 'prof', 'professore',

    // Dutch Titles
    'meneer', 'mevrouw', 'juffrouw', 'dokter', 'professor',

    // Portuguese Titles
    'sr', 'senhor', 'sra', 'senhora', 'srta', 'senhorita', 'doutor', 'doutora', 'professor',

    // Greek Titles
    'κύριος', 'κυρία', 'δεσποινίς', 'δρ', 'καθηγητής',

    // Danish Titles
    'hr', 'fru', 'frøken', 'doktor', 'professor',

    // Finnish Titles
    'herra', 'rouva', 'neiti', 'tohtori', 'professori',

    // Swedish Titles
    'herr', 'fru', 'fröken', 'doktor', 'professor',

    // Polish Titles
    'pan', 'pani', 'panna', 'doktor', 'profesor',

    // Czech Titles
    'pan', 'paní', 'slečna', 'doktor', 'profesor',

    // Slovak Titles
    'pán', 'pani', 'slečna', 'doktor', 'profesor',

    // Hungarian Titles
    'úr', 'asszony', 'kisasszony', 'doktor', 'professzor',

    // Bulgarian Titles
    'господин', 'госпожа', 'доктор', 'професор',

    // Romanian Titles
    'domnul', 'doamna', 'domnișoara', 'doctor', 'profesor',

    // Latvian Titles
    'kungs', 'kundze', 'jaunkundze', 'doktors', 'profesors',

    // Lithuanian Titles
    'ponas', 'ponia', 'panelė', 'daktaras', 'profesorius',

    // Estonian Titles
    'härra', 'proua', 'preili', 'doktor', 'professor',

    // Slovenian Titles
    'gospod', 'gospa', 'gospodična', 'doktor', 'profesor',

    // Croatian Titles
    'gospodin', 'gospođa', 'gospođica', 'doktor', 'profesor',

    // Maltese Titles
    'sinjur', 'sinjura', 'sinjurina', 'tabib', 'professur',

    // Luxembourgish Titles
    'här', 'madame', 'fräulein', 'dokter', 'professor',

    // Professional Degrees and Academic Titles
    'phd', 'msc', 'bsc', 'mba', 'ma', 'ba', 'md', 'dsc', 'csc', 'thd', 'dth', 'edd', 'dphil', 'drsc',
    'drhc', 'llb', 'llm', 'ing', 'dipl-ing', 'mgr', 'mudr', 'judr', 'rndr', 'phdr', 'thdr', 'paeddr',
    'pharmdr', 'csc', 'drsc', 'doc', 'prof', 'dr', 'drhc', 'mag', 'lic', 'dr-rer-nat', 'dr-rer-pol',
    'dr-med', 'dr-med-vet', 'dr-theol', 'dr-iur', 'dr-techn', 'dipl-kfm', 'dipl-arch', 'ing-arch',

    // Nobility Titles
    'don', 'doña', 'graf', 'gräfin', 'freiherr', 'freifrau', 'baron', 'baroness', 'herzog', 'herzogin',
    'fürst', 'fürstin', 'marquis', 'marquise', 'viscount', 'viscountess', 'earl', 'count', 'countess',
    'duke', 'duchess', 'prince', 'princess', 'king', 'queen', 'lord', 'lady', 'sir', 'dame',

    // Other European Titles
    'magister', 'licentiate'
];

const suffixes = [
    // Generational Titles
    'jr', 'sr', 'ii', 'iii', 'iv', 'v', 'vi', 'vii',

    // Professional Degrees and Academic Titles
    'phd', 'msc', 'bsc', 'mba', 'ma', 'ba', 'md', 'dsc', 'csc', 'thd', 'dth', 'edd', 'dphil', 'drsc',
    'drhc', 'llb', 'llm', 'ing', 'dipl-ing', 'mgr', 'mudr', 'judr', 'rndr', 'phdr', 'thdr', 'paeddr',
    'pharmdr', 'csc', 'drsc', 'doc', 'prof', 'dr', 'drhc', 'mag', 'lic', 'dr-rer-nat', 'dr-rer-pol',
    'dr-med', 'dr-med-vet', 'dr-theol', 'dr-iur', 'dr-techn', 'dipl-kfm', 'dipl-arch', 'ing-arch',

    // Honorary Titles and Orders
    'kcvo', 'gcvo', 'cvo', 'lvo', 'mvo', 'kbe', 'gbe', 'cbe', 'obe', 'mbe', 'ch', 'kcb', 'gcb', 'kt', 'bt',

    // Military Titles
    'ret', 'usn', 'usa', 'usaf', 'usmc', 'uscg', 'raf', 'rn', 'rtd',

    // Religious Orders
    'sj', 'op', 'ofm', 'osb', 'ocist', 'ofmcap', 'lc', 'osa', 'sdb', 'sss',

    // Other Titles
    'pmp', 'mp', 'mlc', 'qc', 'sc', 'kc',

    // Nobility and Honorary Titles
    'sir', 'dame', 'lord', 'lady', 'baron', 'baroness', 'count', 'countess', 'viscount', 'viscountess',
    'earl', 'duke', 'duchess', 'marquis', 'marquise', 'marchioness'
];


export {
    prefixes,
    suffixes
}