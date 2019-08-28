/*eslint no-debugger: "warn"*/
const baseFontSize = 16;
const spacingUnit = baseFontSize / 2;

const px = (rems = 1) => {
    return baseFontSize * rems;
};

const rems = (p) => {
    return "".concat(p / baseFontSize, "rem");
};
const rgba = (hexColor, a = 1) => {
    if (hexColor.indexOf("#") === 0) {
        hexColor = hexColor.substring(1);
    }
    if (hexColor.length == 3) {
        hexColor =
            hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2];
    }
    let r = parseInt(hexColor.substring(0, 2), 16);
    let g = parseInt(hexColor.substring(2, 4), 16);
    let b = parseInt(hexColor.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
};

//helper functions for css
const functions = { rgba, px, rems };

//All the colors
const palette = {
    type: "dark",
    common: {
        black: "#11001A",
        white: "#D7C9E0"
    },
    primary: {
        darkest: "#180032",
        dark: "#21004A",
        main: "#420094",
        light: "#614B7D",
        lightest: "#77668B"
    },
    secondary: {
        light: "#FFE900",
        main: "#F5A623",
        dark: "#F26738"
    },

    error: {
        main: "#FF0000"
    },
    text: {
        primary: "#D7C9E0",
        secondary: "#A08DB7"
    }
};
//the main gradient for online stuff
const gradient = {
    primary: `linear-gradient(${palette.primary.light}, ${palette.primary.dark})`,
    secondary: `linear-gradient(${palette.secondary.light}, ${palette.secondary.dark})`
};

const colors = {
    primary: "#420094",
    secondary: "#F5A623",
    searchBg: "#77668B",
    success: "#00E900",
    error: "#FF0000"
};

//status color mapping
const status = {
    online: gradient.secondary,
    offline: palette.primary.main,
    synced: palette.common.white,
    inScene: palette.secondary.main,
    none: "transparent"
};

const ScenerTheme = {
    colors,
    palette,
    status,
    gradient,
    spacing: spacingUnit,
    Avatar: {
        rounded: true
    },
    Button: {
        buttonStyle: {
            paddingTop: spacingUnit / 2,
            paddingBottom: spacingUnit / 2,
            paddingLeft: spacingUnit * 2,
            paddingRight: spacingUnit * 2
        },
        titleStyle: {
            fontSize: 14
        }
    },
   
};
export default ScenerTheme;
