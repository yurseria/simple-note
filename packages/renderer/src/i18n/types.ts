export interface Translations {
  menu: {
    file: string;
    edit: string;
    view: string;
    go: string;
    help: string;
  };
  file: {
    newTab: string;
    open: string;
    save: string;
    saveAs: string;
    closeTab: string;
    quit: string;
  };
  edit: {
    undo: string;
    redo: string;
    cut: string;
    copy: string;
    paste: string;
    selectNextOccurrence: string;
    selectAllOccurrences: string;
    selectAll: string;
    find: string;
    replace: string;
  };
  view: {
    appearance: string;
    toggleLineNumbers: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    infoBarStyle: string;
    floatingHud: string;
    statusBar: string;
    languageMode: string;
    plainText: string;
    markdown: string;
    zoom: string;
    zoomIn: string;
    zoomOut: string;
    zoomReset: string;
    toggleFullScreen: string;
    uiLanguage: string;
    korean: string;
    english: string;
  };
  go: {
    gotoLine: string;
  };
  help: {
    about: string;
    devTools: string;
  };
  dialog: {
    gotoLineLabel: string;
    gotoBtn: string;
    cancelBtn: string;
  };
  infobar: {
    charSingular: string;
    charPlural: string;
    wordSingular: string;
    wordPlural: string;
    lineSingular: string;
    linePlural: string;
    langToggleTip: string;
  };
}
