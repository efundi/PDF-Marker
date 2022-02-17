"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const promises_1 = require("fs/promises");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
function getConfig() {
    return (0, promises_1.readFile)(constants_1.CONFIG_DIR + constants_1.CONFIG_FILE).then((data) => {
        if (!(0, utils_1.isJson)(data)) {
            return Promise.reject(constants_1.NOT_CONFIGURED_CONFIG_DIRECTORY);
        }
        return JSON.parse(data.toString());
    });
}
exports.getConfig = getConfig;
//# sourceMappingURL=config.js.map