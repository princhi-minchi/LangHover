// Maps API tense keys to human-readable labels
export const TENSE_DISPLAY_NAMES: Record<string, string> = {
    present: "Present",
    imperfect: "Imperfect",
    future: "Future",
    past: "Past",
    conditional: "Conditional",
    subjunctive_present: "Subjunctive Present",
    subjunctive_imperfect: "Subjunctive Imperfect",
    imperative: "Imperative",
    presentparticiple: "Present Participle", // Fix for "Presentparticiple"
    pastparticiple: "Past Participle",
    passato_prossimo: "Passato Prossimo",
    trapassato_prossimo: "Trapassato Prossimo",
    trapassato_remoto: "Trapassato Remoto",
    futuro_anteriore: "Futuro Anteriore",
    condizionale_passato: "Condizionale Passato",
    congiuntivo_passato: "Congiuntivo Passato",
    congiuntivo_trapassato: "Congiuntivo Trapassato",
    gerund: "Gerund",
    past_gerund: "Past Gerund"
};

// List of all known tense keys for settings
export const ALL_TENSES = Object.keys(TENSE_DISPLAY_NAMES);
