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
    recentFiles: string;
    noRecentFiles: string;
    clearRecentFiles: string;
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
    zenMode: string;
    uiLanguage: string;
    korean: string;
    english: string;
  };
  go: {
    gotoLine: string;
  };
  help: {
    about: string;
    checkForUpdates: string;
    devTools: string;
  };
  dialog: {
    gotoLineLabel: string;
    gotoBtn: string;
    cancelBtn: string;
  };
  toolbar: {
    heading: string;
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    bold: string;
    italic: string;
    strikethrough: string;
    inlineCode: string;
    codeBlock: string;
    blockquote: string;
    unorderedList: string;
    orderedList: string;
    taskList: string;
    link: string;
    image: string;
    table: string;
    tableAddRowAbove: string;
    tableAddRowBelow: string;
    tableAddColLeft: string;
    tableAddColRight: string;
    tableDelRow: string;
    tableDelCol: string;
    horizontalRule: string;
    saveFileFirst: string;
  };
  commandPalette: {
    placeholder: string;
    noResults: string;
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
