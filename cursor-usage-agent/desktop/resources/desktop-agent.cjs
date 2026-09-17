#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_node_fs5 = require("node:fs");
var import_node_path5 = require("node:path");

// node_modules/commander/lib/error.js
var CommanderError = class extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   */
  constructor(exitCode, code, message) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = void 0;
  }
};
var InvalidArgumentError = class extends CommanderError {
  /**
   * Constructs the InvalidArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   */
  constructor(message) {
    super(1, "commander.invalidArgument", message);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
};

// node_modules/commander/lib/argument.js
var Argument = class {
  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @param {string} name
   * @param {string} [description]
   */
  constructor(name, description) {
    this.description = description || "";
    this.variadic = false;
    this.parseArg = void 0;
    this.defaultValue = void 0;
    this.defaultValueDescription = void 0;
    this.argChoices = void 0;
    switch (name[0]) {
      case "<":
        this.required = true;
        this._name = name.slice(1, -1);
        break;
      case "[":
        this.required = false;
        this._name = name.slice(1, -1);
        break;
      default:
        this.required = true;
        this._name = name;
        break;
    }
    if (this._name.endsWith("...")) {
      this.variadic = true;
      this._name = this._name.slice(0, -3);
    }
  }
  /**
   * Return argument name.
   *
   * @return {string}
   */
  name() {
    return this._name;
  }
  /**
   * @package
   */
  _collectValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }
    previous.push(value);
    return previous;
  }
  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Argument}
   */
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   *
   * @param {Function} [fn]
   * @return {Argument}
   */
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  /**
   * Only allow argument value to be one of choices.
   *
   * @param {string[]} values
   * @return {Argument}
   */
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(", ")}.`
        );
      }
      if (this.variadic) {
        return this._collectValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  /**
   * Make argument required.
   *
   * @returns {Argument}
   */
  argRequired() {
    this.required = true;
    return this;
  }
  /**
   * Make argument optional.
   *
   * @returns {Argument}
   */
  argOptional() {
    this.required = false;
    return this;
  }
};
function humanReadableArgName(arg) {
  const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
  return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
}

// node_modules/commander/lib/command.js
var import_node_events = require("node:events");
var import_node_child_process = __toESM(require("node:child_process"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_process = __toESM(require("node:process"), 1);
var import_node_util2 = require("node:util");

// node_modules/commander/lib/help.js
var import_node_util = require("node:util");
var Help = class {
  constructor() {
    this.helpWidth = void 0;
    this.minWidthToWrap = 40;
    this.sortSubcommands = false;
    this.sortOptions = false;
    this.showGlobalOptions = false;
  }
  /**
   * prepareContext is called by Commander after applying overrides from `Command.configureHelp()`
   * and just before calling `formatHelp()`.
   *
   * Commander just uses the helpWidth and the rest is provided for optional use by more complex subclasses.
   *
   * @param {{ error?: boolean, helpWidth?: number, outputHasColors?: boolean }} contextOptions
   */
  prepareContext(contextOptions) {
    this.helpWidth = this.helpWidth ?? contextOptions.helpWidth ?? 80;
  }
  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */
  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
    const helpCommand = cmd._getHelpCommand();
    if (helpCommand && !helpCommand._hidden) {
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }
  /**
   * Compare options for sort.
   *
   * @param {Option} a
   * @param {Option} b
   * @returns {number}
   */
  compareOptions(a, b) {
    const getSortKey = (option) => {
      return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
    };
    return getSortKey(a).localeCompare(getSortKey(b));
  }
  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */
  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    const helpOption = cmd._getHelpOption();
    if (helpOption && !helpOption.hidden) {
      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
      if (!removeShort && !removeLong) {
        visibleOptions.push(helpOption);
      } else if (helpOption.long && !removeLong) {
        visibleOptions.push(
          cmd.createOption(helpOption.long, helpOption.description)
        );
      } else if (helpOption.short && !removeShort) {
        visibleOptions.push(
          cmd.createOption(helpOption.short, helpOption.description)
        );
      }
    }
    if (this.sortOptions) {
      visibleOptions.sort(this.compareOptions);
    }
    return visibleOptions;
  }
  /**
   * Get an array of the visible global options. (Not including help.)
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */
  visibleGlobalOptions(cmd) {
    if (!this.showGlobalOptions) return [];
    const globalOptions = [];
    for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      const visibleOptions = ancestorCmd.options.filter(
        (option) => !option.hidden
      );
      globalOptions.push(...visibleOptions);
    }
    if (this.sortOptions) {
      globalOptions.sort(this.compareOptions);
    }
    return globalOptions;
  }
  /**
   * Get an array of the arguments if any have a description.
   *
   * @param {Command} cmd
   * @returns {Argument[]}
   */
  visibleArguments(cmd) {
    if (cmd._argsDescription) {
      cmd.registeredArguments.forEach((argument) => {
        argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
      });
    }
    if (cmd.registeredArguments.find((argument) => argument.description)) {
      return cmd.registeredArguments;
    }
    return [];
  }
  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  subcommandTerm(cmd) {
    const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
    return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
    (args ? " " + args : "");
  }
  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */
  optionTerm(option) {
    return option.flags;
  }
  /**
   * Get the argument term to show in the list of arguments.
   *
   * @param {Argument} argument
   * @returns {string}
   */
  argumentTerm(argument) {
    return argument.name();
  }
  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(
        max,
        this.displayWidth(
          helper.styleSubcommandTerm(helper.subcommandTerm(command))
        )
      );
    }, 0);
  }
  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(
        max,
        this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
      );
    }, 0);
  }
  /**
   * Get the longest global option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestGlobalOptionTermLength(cmd, helper) {
    return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
      return Math.max(
        max,
        this.displayWidth(helper.styleOptionTerm(helper.optionTerm(option)))
      );
    }, 0);
  }
  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(
        max,
        this.displayWidth(
          helper.styleArgumentTerm(helper.argumentTerm(argument))
        )
      );
    }, 0);
  }
  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  commandUsage(cmd) {
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + "|" + cmd._aliases[0];
    }
    let ancestorCmdNames = "";
    for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
      ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
    }
    return ancestorCmdNames + cmdName + " " + cmd.usage();
  }
  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  commandDescription(cmd) {
    return cmd.description();
  }
  /**
   * Get the subcommand summary to show in the list of subcommands.
   * (Fallback to description for backwards compatibility.)
   *
   * @param {Command} cmd
   * @returns {string}
   */
  subcommandDescription(cmd) {
    return cmd.summary() || cmd.description();
  }
  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */
  optionDescription(option) {
    const extraInfo = [];
    if (option.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
      );
    }
    if (option.defaultValue !== void 0) {
      const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
      if (showDefault) {
        extraInfo.push(
          `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
        );
      }
    }
    if (option.presetArg !== void 0 && option.optional) {
      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
    }
    if (option.envVar !== void 0) {
      extraInfo.push(`env: ${option.envVar}`);
    }
    if (extraInfo.length > 0) {
      const extraDescription = `(${extraInfo.join(", ")})`;
      if (option.description) {
        return `${option.description} ${extraDescription}`;
      }
      return extraDescription;
    }
    return option.description;
  }
  /**
   * Get the argument description to show in the list of arguments.
   *
   * @param {Argument} argument
   * @return {string}
   */
  argumentDescription(argument) {
    const extraInfo = [];
    if (argument.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
      );
    }
    if (argument.defaultValue !== void 0) {
      extraInfo.push(
        `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
      );
    }
    if (extraInfo.length > 0) {
      const extraDescription = `(${extraInfo.join(", ")})`;
      if (argument.description) {
        return `${argument.description} ${extraDescription}`;
      }
      return extraDescription;
    }
    return argument.description;
  }
  /**
   * Format a list of items, given a heading and an array of formatted items.
   *
   * @param {string} heading
   * @param {string[]} items
   * @param {Help} helper
   * @returns string[]
   */
  formatItemList(heading, items, helper) {
    if (items.length === 0) return [];
    return [helper.styleTitle(heading), ...items, ""];
  }
  /**
   * Group items by their help group heading.
   *
   * @param {Command[] | Option[]} unsortedItems
   * @param {Command[] | Option[]} visibleItems
   * @param {Function} getGroup
   * @returns {Map<string, Command[] | Option[]>}
   */
  groupItems(unsortedItems, visibleItems, getGroup) {
    const result = /* @__PURE__ */ new Map();
    unsortedItems.forEach((item) => {
      const group = getGroup(item);
      if (!result.has(group)) result.set(group, []);
    });
    visibleItems.forEach((item) => {
      const group = getGroup(item);
      if (!result.has(group)) {
        result.set(group, []);
      }
      result.get(group).push(item);
    });
    return result;
  }
  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */
  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth ?? 80;
    function callFormatItem(term, description) {
      return helper.formatItem(term, termWidth, description, helper);
    }
    let output = [
      `${helper.styleTitle("Usage:")} ${helper.styleUsage(helper.commandUsage(cmd))}`,
      ""
    ];
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([
        helper.boxWrap(
          helper.styleCommandDescription(commandDescription),
          helpWidth
        ),
        ""
      ]);
    }
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return callFormatItem(
        helper.styleArgumentTerm(helper.argumentTerm(argument)),
        helper.styleArgumentDescription(helper.argumentDescription(argument))
      );
    });
    output = output.concat(
      this.formatItemList("Arguments:", argumentList, helper)
    );
    const optionGroups = this.groupItems(
      cmd.options,
      helper.visibleOptions(cmd),
      (option) => option.helpGroupHeading ?? "Options:"
    );
    optionGroups.forEach((options, group) => {
      const optionList = options.map((option) => {
        return callFormatItem(
          helper.styleOptionTerm(helper.optionTerm(option)),
          helper.styleOptionDescription(helper.optionDescription(option))
        );
      });
      output = output.concat(this.formatItemList(group, optionList, helper));
    });
    if (helper.showGlobalOptions) {
      const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
        return callFormatItem(
          helper.styleOptionTerm(helper.optionTerm(option)),
          helper.styleOptionDescription(helper.optionDescription(option))
        );
      });
      output = output.concat(
        this.formatItemList("Global Options:", globalOptionList, helper)
      );
    }
    const commandGroups = this.groupItems(
      cmd.commands,
      helper.visibleCommands(cmd),
      (sub) => sub.helpGroup() || "Commands:"
    );
    commandGroups.forEach((commands, group) => {
      const commandList = commands.map((sub) => {
        return callFormatItem(
          helper.styleSubcommandTerm(helper.subcommandTerm(sub)),
          helper.styleSubcommandDescription(helper.subcommandDescription(sub))
        );
      });
      output = output.concat(this.formatItemList(group, commandList, helper));
    });
    return output.join("\n");
  }
  /**
   * Return display width of string, ignoring ANSI escape sequences. Used in padding and wrapping calculations.
   *
   * @param {string} str
   * @returns {number}
   */
  displayWidth(str) {
    return (0, import_node_util.stripVTControlCharacters)(str).length;
  }
  /**
   * Style the title for displaying in the help. Called with 'Usage:', 'Options:', etc.
   *
   * @param {string} str
   * @returns {string}
   */
  styleTitle(str) {
    return str;
  }
  styleUsage(str) {
    return str.split(" ").map((word) => {
      if (word === "[options]") return this.styleOptionText(word);
      if (word === "[command]") return this.styleSubcommandText(word);
      if (word[0] === "[" || word[0] === "<")
        return this.styleArgumentText(word);
      return this.styleCommandText(word);
    }).join(" ");
  }
  styleCommandDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleOptionDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleSubcommandDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleArgumentDescription(str) {
    return this.styleDescriptionText(str);
  }
  styleDescriptionText(str) {
    return str;
  }
  styleOptionTerm(str) {
    return this.styleOptionText(str);
  }
  styleSubcommandTerm(str) {
    return str.split(" ").map((word) => {
      if (word === "[options]") return this.styleOptionText(word);
      if (word[0] === "[" || word[0] === "<")
        return this.styleArgumentText(word);
      return this.styleSubcommandText(word);
    }).join(" ");
  }
  styleArgumentTerm(str) {
    return this.styleArgumentText(str);
  }
  styleOptionText(str) {
    return str;
  }
  styleArgumentText(str) {
    return str;
  }
  styleSubcommandText(str) {
    return str;
  }
  styleCommandText(str) {
    return str;
  }
  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  padWidth(cmd, helper) {
    return Math.max(
      helper.longestOptionTermLength(cmd, helper),
      helper.longestGlobalOptionTermLength(cmd, helper),
      helper.longestSubcommandTermLength(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper)
    );
  }
  /**
   * Detect manually wrapped and indented strings by checking for line break followed by whitespace.
   *
   * @param {string} str
   * @returns {boolean}
   */
  preformatted(str) {
    return /\n[^\S\r\n]/.test(str);
  }
  /**
   * Format the "item", which consists of a term and description. Pad the term and wrap the description, indenting the following lines.
   *
   * So "TTT", 5, "DDD DDDD DD DDD" might be formatted for this.helpWidth=17 like so:
   *   TTT  DDD DDDD
   *        DD DDD
   *
   * @param {string} term
   * @param {number} termWidth
   * @param {string} description
   * @param {Help} helper
   * @returns {string}
   */
  formatItem(term, termWidth, description, helper) {
    const itemIndent = 2;
    const itemIndentStr = " ".repeat(itemIndent);
    if (!description) return itemIndentStr + term;
    const paddedTerm = term.padEnd(
      termWidth + term.length - helper.displayWidth(term)
    );
    const spacerWidth = 2;
    const helpWidth = this.helpWidth ?? 80;
    const remainingWidth = helpWidth - termWidth - spacerWidth - itemIndent;
    let formattedDescription;
    if (remainingWidth < this.minWidthToWrap || helper.preformatted(description)) {
      formattedDescription = description;
    } else {
      const wrappedDescription = helper.boxWrap(description, remainingWidth);
      formattedDescription = wrappedDescription.replace(
        /\n/g,
        "\n" + " ".repeat(termWidth + spacerWidth)
      );
    }
    return itemIndentStr + paddedTerm + " ".repeat(spacerWidth) + formattedDescription.replace(/\n/g, `
${itemIndentStr}`);
  }
  /**
   * Wrap a string at whitespace, preserving existing line breaks.
   * Wrapping is skipped if the width is less than `minWidthToWrap`.
   *
   * @param {string} str
   * @param {number} width
   * @returns {string}
   */
  boxWrap(str, width) {
    if (width < this.minWidthToWrap) return str;
    const rawLines = str.split(/\r\n|\n/);
    const chunkPattern = /[\s]*[^\s]+/g;
    const wrappedLines = [];
    rawLines.forEach((line) => {
      const chunks = line.match(chunkPattern);
      if (chunks === null) {
        wrappedLines.push("");
        return;
      }
      let sumChunks = [chunks.shift()];
      let sumWidth = this.displayWidth(sumChunks[0]);
      chunks.forEach((chunk) => {
        const visibleWidth = this.displayWidth(chunk);
        if (sumWidth + visibleWidth <= width) {
          sumChunks.push(chunk);
          sumWidth += visibleWidth;
          return;
        }
        wrappedLines.push(sumChunks.join(""));
        const nextChunk = chunk.trimStart();
        sumChunks = [nextChunk];
        sumWidth = this.displayWidth(nextChunk);
      });
      wrappedLines.push(sumChunks.join(""));
    });
    return wrappedLines.join("\n");
  }
};

// node_modules/commander/lib/option.js
var Option = class {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */
  constructor(flags, description) {
    this.flags = flags;
    this.description = description || "";
    this.required = flags.includes("<");
    this.optional = flags.includes("[");
    this.variadic = /\w\.\.\.[>\]]$/.test(flags);
    this.mandatory = false;
    const optionFlags = splitOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith("--no-");
    }
    this.defaultValue = void 0;
    this.defaultValueDescription = void 0;
    this.presetArg = void 0;
    this.envVar = void 0;
    this.parseArg = void 0;
    this.hidden = false;
    this.argChoices = void 0;
    this.conflictsWith = [];
    this.implied = void 0;
    this.helpGroupHeading = void 0;
  }
  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Option}
   */
  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  }
  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   *
   * @param {*} arg
   * @return {Option}
   */
  preset(arg) {
    this.presetArg = arg;
    return this;
  }
  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   *
   * @param {(string | string[])} names
   * @return {Option}
   */
  conflicts(names) {
    this.conflictsWith = this.conflictsWith.concat(names);
    return this;
  }
  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   *
   * @param {object} impliedOptionValues
   * @return {Option}
   */
  implies(impliedOptionValues) {
    let newImplied = impliedOptionValues;
    if (typeof impliedOptionValues === "string") {
      newImplied = { [impliedOptionValues]: true };
    }
    this.implied = Object.assign(this.implied || {}, newImplied);
    return this;
  }
  /**
   * Set environment variable to check for option value.
   *
   * An environment variable is only used if when processed the current option value is
   * undefined, or the source of the current value is 'default' or 'config' or 'env'.
   *
   * @param {string} name
   * @return {Option}
   */
  env(name) {
    this.envVar = name;
    return this;
  }
  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */
  argParser(fn) {
    this.parseArg = fn;
    return this;
  }
  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */
  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  }
  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */
  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  }
  /**
   * @package
   */
  _collectValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }
    previous.push(value);
    return previous;
  }
  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */
  choices(values) {
    this.argChoices = values.slice();
    this.parseArg = (arg, previous) => {
      if (!this.argChoices.includes(arg)) {
        throw new InvalidArgumentError(
          `Allowed choices are ${this.argChoices.join(", ")}.`
        );
      }
      if (this.variadic) {
        return this._collectValue(arg, previous);
      }
      return arg;
    };
    return this;
  }
  /**
   * Return option name.
   *
   * @return {string}
   */
  name() {
    if (this.long) {
      return this.long.replace(/^--/, "");
    }
    return this.short.replace(/^-/, "");
  }
  /**
   * Return option name, in a camelcase format that can be used
   * as an object attribute key.
   *
   * @return {string}
   */
  attributeName() {
    if (this.negate) {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    return camelcase(this.name());
  }
  /**
   * Set the help group heading.
   *
   * @param {string} heading
   * @return {Option}
   */
  helpGroup(heading) {
    this.helpGroupHeading = heading;
    return this;
  }
  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @package
   */
  is(arg) {
    return this.short === arg || this.long === arg;
  }
  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   *
   * @return {boolean}
   * @package
   */
  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
};
var DualOptions = class {
  /**
   * @param {Option[]} options
   */
  constructor(options) {
    this.positiveOptions = /* @__PURE__ */ new Map();
    this.negativeOptions = /* @__PURE__ */ new Map();
    this.dualOptions = /* @__PURE__ */ new Set();
    options.forEach((option) => {
      if (option.negate) {
        this.negativeOptions.set(option.attributeName(), option);
      } else {
        this.positiveOptions.set(option.attributeName(), option);
      }
    });
    this.negativeOptions.forEach((value, key) => {
      if (this.positiveOptions.has(key)) {
        this.dualOptions.add(key);
      }
    });
  }
  /**
   * Did the value come from the option, and not from possible matching dual option?
   *
   * @param {*} value
   * @param {Option} option
   * @returns {boolean}
   */
  valueFromOption(value, option) {
    const optionKey = option.attributeName();
    if (!this.dualOptions.has(optionKey)) return true;
    const preset = this.negativeOptions.get(optionKey).presetArg;
    const negativeValue = preset !== void 0 ? preset : false;
    return option.negate === (negativeValue === value);
  }
};
function camelcase(str) {
  return str.split("-").reduce((str2, word) => {
    return str2 + word[0].toUpperCase() + word.slice(1);
  });
}
function splitOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  const shortFlagExp = /^-[^-]$/;
  const longFlagExp = /^--[^-]/;
  const flagParts = flags.split(/[ |,]+/).concat("guard");
  if (shortFlagExp.test(flagParts[0])) shortFlag = flagParts.shift();
  if (longFlagExp.test(flagParts[0])) longFlag = flagParts.shift();
  if (!shortFlag && shortFlagExp.test(flagParts[0]))
    shortFlag = flagParts.shift();
  if (!shortFlag && longFlagExp.test(flagParts[0])) {
    shortFlag = longFlag;
    longFlag = flagParts.shift();
  }
  if (flagParts[0].startsWith("-")) {
    const unsupportedFlag = flagParts[0];
    const baseError = `option creation failed due to '${unsupportedFlag}' in option flags '${flags}'`;
    if (/^-[^-][^-]/.test(unsupportedFlag))
      throw new Error(
        `${baseError}
- a short flag is a single dash and a single character
  - either use a single dash and a single character (for a short flag)
  - or use a double dash for a long option (and can have two, like '--ws, --workspace')`
      );
    if (shortFlagExp.test(unsupportedFlag))
      throw new Error(`${baseError}
- too many short flags`);
    if (longFlagExp.test(unsupportedFlag))
      throw new Error(`${baseError}
- too many long flags`);
    throw new Error(`${baseError}
- unrecognised flag format`);
  }
  if (shortFlag === void 0 && longFlag === void 0)
    throw new Error(
      `option creation failed due to no flags found in '${flags}'.`
    );
  return { shortFlag, longFlag };
}

// node_modules/commander/lib/suggestSimilar.js
var maxDistance = 3;
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > maxDistance)
    return Math.max(a.length, b.length);
  const d = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      let cost;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
      } else {
        cost = 1;
      }
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        // deletion
        d[i][j - 1] + 1,
        // insertion
        d[i - 1][j - 1] + cost
        // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}
function suggestSimilar(word, candidates) {
  if (!candidates || candidates.length === 0) return "";
  candidates = Array.from(new Set(candidates));
  const searchingOptions = word.startsWith("--");
  if (searchingOptions) {
    word = word.slice(2);
    candidates = candidates.map((candidate) => candidate.slice(2));
  }
  let similar = [];
  let bestDistance = maxDistance;
  const minSimilarity = 0.4;
  candidates.forEach((candidate) => {
    if (candidate.length <= 1) return;
    const distance = editDistance(word, candidate);
    const length = Math.max(word.length, candidate.length);
    const similarity = (length - distance) / length;
    if (similarity > minSimilarity) {
      if (distance < bestDistance) {
        bestDistance = distance;
        similar = [candidate];
      } else if (distance === bestDistance) {
        similar.push(candidate);
      }
    }
  });
  similar.sort((a, b) => a.localeCompare(b));
  if (searchingOptions) {
    similar = similar.map((candidate) => `--${candidate}`);
  }
  if (similar.length > 1) {
    return `
(Did you mean one of ${similar.join(", ")}?)`;
  }
  if (similar.length === 1) {
    return `
(Did you mean ${similar[0]}?)`;
  }
  return "";
}

// node_modules/commander/lib/command.js
var Command = class _Command extends import_node_events.EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */
  constructor(name) {
    super();
    this.commands = [];
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = false;
    this.registeredArguments = [];
    this._args = this.registeredArguments;
    this.args = [];
    this.rawArgs = [];
    this.processedArgs = [];
    this._scriptPath = null;
    this._name = name || "";
    this._optionValues = {};
    this._optionValueSources = {};
    this._storeOptionsAsProperties = false;
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null;
    this._executableDir = null;
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = "";
    this._summary = "";
    this._argsDescription = void 0;
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;
    this._lifeCycleHooks = {};
    this._showHelpAfterError = false;
    this._showSuggestionAfterError = true;
    this._savedState = null;
    this._outputConfiguration = {
      writeOut: (str) => import_node_process.default.stdout.write(str),
      writeErr: (str) => import_node_process.default.stderr.write(str),
      outputError: (str, write) => write(str),
      getOutHelpWidth: () => import_node_process.default.stdout.isTTY ? import_node_process.default.stdout.columns : void 0,
      getErrHelpWidth: () => import_node_process.default.stderr.isTTY ? import_node_process.default.stderr.columns : void 0,
      getOutHasColors: () => useColor() ?? (import_node_process.default.stdout.isTTY && import_node_process.default.stdout.hasColors?.()),
      getErrHasColors: () => useColor() ?? (import_node_process.default.stderr.isTTY && import_node_process.default.stderr.hasColors?.()),
      stripColor: (str) => (0, import_node_util2.stripVTControlCharacters)(str)
    };
    this._hidden = false;
    this._helpOption = void 0;
    this._addImplicitHelpCommand = void 0;
    this._helpCommand = void 0;
    this._helpConfiguration = {};
    this._helpGroupHeading = void 0;
    this._defaultCommandGroup = void 0;
    this._defaultOptionGroup = void 0;
  }
  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   *
   * @param {Command} sourceCommand
   * @return {Command} `this` command for chaining
   */
  copyInheritedSettings(sourceCommand) {
    this._outputConfiguration = sourceCommand._outputConfiguration;
    this._helpOption = sourceCommand._helpOption;
    this._helpCommand = sourceCommand._helpCommand;
    this._helpConfiguration = sourceCommand._helpConfiguration;
    this._exitCallback = sourceCommand._exitCallback;
    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
    this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
    this._allowExcessArguments = sourceCommand._allowExcessArguments;
    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
    this._showHelpAfterError = sourceCommand._showHelpAfterError;
    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
    return this;
  }
  /**
   * @returns {Command[]}
   * @private
   */
  _getCommandAndAncestors() {
    const result = [];
    for (let command = this; command; command = command.parent) {
      result.push(command);
    }
    return result;
  }
  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * @example
   * // Command implemented using action handler (description is supplied separately to `.command`)
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   *
   * // Command implemented using separate executable file (description is second parameter to `.command`)
   * program
   *   .command('start <service>', 'start named service')
   *   .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */
  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === "object" && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const cmd = this.createCommand(name);
    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    cmd._hidden = !!(opts.noHelp || opts.hidden);
    cmd._executableFile = opts.executableFile || null;
    if (args) cmd.arguments(args);
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd.copyInheritedSettings(this);
    if (desc) return this;
    return cmd;
  }
  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */
  createCommand(name) {
    return new _Command(name);
  }
  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */
  createHelp() {
    return Object.assign(new Help(), this.configureHelp());
  }
  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */
  configureHelp(configuration) {
    if (configuration === void 0) return this._helpConfiguration;
    this._helpConfiguration = configuration;
    return this;
  }
  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *     // change how output being written, defaults to stdout and stderr
   *     writeOut(str)
   *     writeErr(str)
   *     // change how output being written for errors, defaults to writeErr
   *     outputError(str, write) // used for displaying errors and not used for displaying help
   *     // specify width for wrapping help
   *     getOutHelpWidth()
   *     getErrHelpWidth()
   *     // color support, currently only used with Help
   *     getOutHasColors()
   *     getErrHasColors()
   *     stripColor() // used to remove ANSI escape codes if output does not have colors
   *
   * @param {object} [configuration] - configuration options
   * @return {(Command | object)} `this` command for chaining, or stored configuration
   */
  configureOutput(configuration) {
    if (configuration === void 0) return this._outputConfiguration;
    this._outputConfiguration = {
      ...this._outputConfiguration,
      ...configuration
    };
    return this;
  }
  /**
   * Display the help or a custom message after an error occurs.
   *
   * @param {(boolean|string)} [displayHelp]
   * @return {Command} `this` command for chaining
   */
  showHelpAfterError(displayHelp = true) {
    if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
    this._showHelpAfterError = displayHelp;
    return this;
  }
  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   *
   * @param {boolean} [displaySuggestion]
   * @return {Command} `this` command for chaining
   */
  showSuggestionAfterError(displaySuggestion = true) {
    this._showSuggestionAfterError = !!displaySuggestion;
    return this;
  }
  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */
  addCommand(cmd, opts) {
    if (!cmd._name) {
      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
    }
    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true;
    this._registerCommand(cmd);
    cmd.parent = this;
    cmd._checkForBrokenPassThrough();
    return this;
  }
  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   *
   * @param {string} name
   * @param {string} [description]
   * @return {Argument} new argument
   */
  createArgument(name, description) {
    return new Argument(name, description);
  }
  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   *
   * @param {string} name
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom argument processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  argument(name, description, parseArg, defaultValue) {
    const argument = this.createArgument(name, description);
    if (typeof parseArg === "function") {
      argument.default(defaultValue).argParser(parseArg);
    } else {
      argument.default(parseArg);
    }
    this.addArgument(argument);
    return this;
  }
  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * program.arguments('<cmd> [env]');
   *
   * @param {string} names
   * @return {Command} `this` command for chaining
   */
  arguments(names) {
    names.trim().split(/ +/).forEach((detail) => {
      this.argument(detail);
    });
    return this;
  }
  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @param {Argument} argument
   * @return {Command} `this` command for chaining
   */
  addArgument(argument) {
    const previousArgument = this.registeredArguments.slice(-1)[0];
    if (previousArgument?.variadic) {
      throw new Error(
        `only the last argument can be variadic '${previousArgument.name()}'`
      );
    }
    if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
      throw new Error(
        `a default value for a required argument is never used: '${argument.name()}'`
      );
    }
    this.registeredArguments.push(argument);
    return this;
  }
  /**
   * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
   *
   * @example
   *    program.helpCommand('help [cmd]');
   *    program.helpCommand('help [cmd]', 'show help');
   *    program.helpCommand(false); // suppress default help command
   *    program.helpCommand(true); // add help command even if no subcommands
   *
   * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
   * @param {string} [description] - custom description
   * @return {Command} `this` command for chaining
   */
  helpCommand(enableOrNameAndArgs, description) {
    if (typeof enableOrNameAndArgs === "boolean") {
      this._addImplicitHelpCommand = enableOrNameAndArgs;
      if (enableOrNameAndArgs && this._defaultCommandGroup) {
        this._initCommandGroup(this._getHelpCommand());
      }
      return this;
    }
    const nameAndArgs = enableOrNameAndArgs ?? "help [command]";
    const [, helpName, helpArgs] = nameAndArgs.match(/([^ ]+) *(.*)/);
    const helpDescription = description ?? "display help for command";
    const helpCommand = this.createCommand(helpName);
    helpCommand.helpOption(false);
    if (helpArgs) helpCommand.arguments(helpArgs);
    if (helpDescription) helpCommand.description(helpDescription);
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    if (enableOrNameAndArgs || description) this._initCommandGroup(helpCommand);
    return this;
  }
  /**
   * Add prepared custom help command.
   *
   * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
   * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
   * @return {Command} `this` command for chaining
   */
  addHelpCommand(helpCommand, deprecatedDescription) {
    if (typeof helpCommand !== "object") {
      this.helpCommand(helpCommand, deprecatedDescription);
      return this;
    }
    this._addImplicitHelpCommand = true;
    this._helpCommand = helpCommand;
    this._initCommandGroup(helpCommand);
    return this;
  }
  /**
   * Lazy create help command.
   *
   * @return {(Command|null)}
   * @package
   */
  _getHelpCommand() {
    const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
    if (hasImplicitHelpCommand) {
      if (this._helpCommand === void 0) {
        this.helpCommand(void 0, void 0);
      }
      return this._helpCommand;
    }
    return null;
  }
  /**
   * Add hook for life cycle event.
   *
   * @param {string} event
   * @param {Function} listener
   * @return {Command} `this` command for chaining
   */
  hook(event, listener) {
    const allowedValues = ["preSubcommand", "preAction", "postAction"];
    if (!allowedValues.includes(event)) {
      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    if (this._lifeCycleHooks[event]) {
      this._lifeCycleHooks[event].push(listener);
    } else {
      this._lifeCycleHooks[event] = [listener];
    }
    return this;
  }
  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */
  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== "commander.executeSubCommandAsync") {
          throw err;
        } else {
        }
      };
    }
    return this;
  }
  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @private
   */
  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
    }
    import_node_process.default.exit(exitCode);
  }
  /**
   * Register callback `fn` for the command.
   *
   * @example
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *      // do work here
   *   });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */
  action(fn) {
    const listener = (args) => {
      const expectedArgsCount = this.registeredArguments.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this;
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);
      return fn.apply(this, actionArgs);
    };
    this._actionHandler = listener;
    return this;
  }
  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */
  createOption(flags, description) {
    return new Option(flags, description);
  }
  /**
   * Wrap parseArgs to catch 'commander.invalidArgument'.
   *
   * @param {(Option | Argument)} target
   * @param {string} value
   * @param {*} previous
   * @param {string} invalidArgumentMessage
   * @private
   */
  _callParseArg(target, value, previous, invalidArgumentMessage) {
    try {
      return target.parseArg(value, previous);
    } catch (err) {
      if (err.code === "commander.invalidArgument") {
        const message = `${invalidArgumentMessage} ${err.message}`;
        this.error(message, { exitCode: err.exitCode, code: err.code });
      }
      throw err;
    }
  }
  /**
   * Check for option flag conflicts.
   * Register option if no conflicts found, or throw on conflict.
   *
   * @param {Option} option
   * @private
   */
  _registerOption(option) {
    const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
    if (matchingOption) {
      const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
    }
    this._initOptionGroup(option);
    this.options.push(option);
  }
  /**
   * Check for command name and alias conflicts with existing commands.
   * Register command if no conflicts found, or throw on conflict.
   *
   * @param {Command} command
   * @private
   */
  _registerCommand(command) {
    const knownBy = (cmd) => {
      return [cmd.name()].concat(cmd.aliases());
    };
    const alreadyUsed = knownBy(command).find(
      (name) => this._findCommand(name)
    );
    if (alreadyUsed) {
      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
      const newCmd = knownBy(command).join("|");
      throw new Error(
        `cannot add command '${newCmd}' as already have command '${existingCmd}'`
      );
    }
    this._initCommandGroup(command);
    this.commands.push(command);
  }
  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(option) {
    this._registerOption(option);
    const oname = option.name();
    const name = option.attributeName();
    if (option.defaultValue !== void 0) {
      this.setOptionValueWithSource(name, option.defaultValue, "default");
    }
    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
      if (val == null && option.presetArg !== void 0) {
        val = option.presetArg;
      }
      const oldValue = this.getOptionValue(name);
      if (val !== null && option.parseArg) {
        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
      } else if (val !== null && option.variadic) {
        val = option._collectValue(val, oldValue);
      }
      if (val == null) {
        if (option.negate) {
          val = false;
        } else if (option.isBoolean() || option.optional) {
          val = true;
        } else {
          val = "";
        }
      }
      this.setOptionValueWithSource(name, val, valueSource);
    };
    this.on("option:" + oname, (val) => {
      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
      handleOptionValue(val, invalidValueMessage, "cli");
    });
    if (option.envVar) {
      this.on("optionEnv:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "env");
      });
    }
    return this;
  }
  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @return {Command} `this` command for chaining
   * @private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    if (typeof flags === "object" && flags instanceof Option) {
      throw new Error(
        "To add an Option object use addOption() instead of option() or requiredOption()"
      );
    }
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === "function") {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }
    return this.addOption(option);
  }
  /**
   * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
   * option-argument is indicated by `<>` and an optional option-argument by `[]`.
   *
   * See the README for more details, and see also addOption() and requiredOption().
   *
   * @example
   * program
   *     .option('-p, --pepper', 'add pepper')
   *     .option('--pt, --pizza-type <TYPE>', 'type of pizza') // required option-argument
   *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
   *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  option(flags, description, parseArg, defaultValue) {
    return this._optionEx({}, flags, description, parseArg, defaultValue);
  }
  /**
   * Add a required option which must have a value after parsing. This usually means
   * the option must be specified on the command line. (Otherwise the same as .option().)
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {(Function|*)} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  requiredOption(flags, description, parseArg, defaultValue) {
    return this._optionEx(
      { mandatory: true },
      flags,
      description,
      parseArg,
      defaultValue
    );
  }
  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * // for `.option('-f,--flag [value]'):
   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
   * @return {Command} `this` command for chaining
   */
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  }
  /**
   * Allow unknown options on the command line.
   *
   * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
   * @return {Command} `this` command for chaining
   */
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  }
  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
   * @return {Command} `this` command for chaining
   */
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  }
  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {boolean} [positional]
   * @return {Command} `this` command for chaining
   */
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  }
  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {boolean} [passThrough] for unknown options.
   * @return {Command} `this` command for chaining
   */
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    this._checkForBrokenPassThrough();
    return this;
  }
  /**
   * @private
   */
  _checkForBrokenPassThrough() {
    if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
      throw new Error(
        `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
      );
    }
  }
  /**
   * Whether to store option values as properties on command object,
   * or store separately (specify false). In both cases the option values can be accessed using .opts().
   *
   * @param {boolean} [storeAsProperties=true]
   * @return {Command} `this` command for chaining
   */
  storeOptionsAsProperties(storeAsProperties = true) {
    if (this.options.length) {
      throw new Error("call .storeOptionsAsProperties() before adding options");
    }
    if (Object.keys(this._optionValues).length) {
      throw new Error(
        "call .storeOptionsAsProperties() before setting option values"
      );
    }
    this._storeOptionsAsProperties = !!storeAsProperties;
    return this;
  }
  /**
   * Retrieve option value.
   *
   * @param {string} key
   * @return {object} value
   */
  getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  }
  /**
   * Store option value.
   *
   * @param {string} key
   * @param {object} value
   * @return {Command} `this` command for chaining
   */
  setOptionValue(key, value) {
    return this.setOptionValueWithSource(key, value, void 0);
  }
  /**
   * Store option value and where the value came from.
   *
   * @param {string} key
   * @param {object} value
   * @param {string} source - expected values are default/config/env/cli/implied
   * @return {Command} `this` command for chaining
   */
  setOptionValueWithSource(key, value, source) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
    this._optionValueSources[key] = source;
    return this;
  }
  /**
   * Get source of option value.
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */
  getOptionValueSource(key) {
    return this._optionValueSources[key];
  }
  /**
   * Get source of option value. See also .optsWithGlobals().
   * Expected values are default | config | env | cli | implied
   *
   * @param {string} key
   * @return {string}
   */
  getOptionValueSourceWithGlobals(key) {
    let source;
    this._getCommandAndAncestors().forEach((cmd) => {
      if (cmd.getOptionValueSource(key) !== void 0) {
        source = cmd.getOptionValueSource(key);
      }
    });
    return source;
  }
  /**
   * Get user arguments from implied or explicit arguments.
   * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
   *
   * @private
   */
  _prepareUserArgs(argv, parseOptions) {
    if (argv !== void 0 && !Array.isArray(argv)) {
      throw new Error("first parameter to parse must be array or undefined");
    }
    parseOptions = parseOptions || {};
    if (argv === void 0 && parseOptions.from === void 0) {
      if (import_node_process.default.versions?.electron) {
        parseOptions.from = "electron";
      }
      const execArgv = import_node_process.default.execArgv ?? [];
      if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
        parseOptions.from = "eval";
      }
    }
    if (argv === void 0) {
      argv = import_node_process.default.argv;
    }
    this.rawArgs = argv.slice();
    let userArgs;
    switch (parseOptions.from) {
      case void 0:
      case "node":
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case "electron":
        if (import_node_process.default.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case "user":
        userArgs = argv.slice(0);
        break;
      case "eval":
        userArgs = argv.slice(1);
        break;
      default:
        throw new Error(
          `unexpected parse option { from: '${parseOptions.from}' }`
        );
    }
    if (!this._name && this._scriptPath)
      this.nameFromFilename(this._scriptPath);
    this._name = this._name || "program";
    return userArgs;
  }
  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * program.parse(); // parse process.argv and auto-detect electron and special node flags
   * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */
  parse(argv, parseOptions) {
    this._prepareForParse();
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    this._parseCommand([], userArgs);
    return this;
  }
  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
   *
   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
   * - `'user'`: just user arguments
   *
   * @example
   * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
   * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */
  async parseAsync(argv, parseOptions) {
    this._prepareForParse();
    const userArgs = this._prepareUserArgs(argv, parseOptions);
    await this._parseCommand([], userArgs);
    return this;
  }
  _prepareForParse() {
    if (this._savedState === null) {
      this.options.filter(
        (option) => option.negate && option.defaultValue === void 0 && this.getOptionValue(option.attributeName()) === void 0
      ).forEach((option) => {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(
            option.attributeName(),
            true,
            "default"
          );
        }
      });
      this.saveStateBeforeParse();
    } else {
      this.restoreStateBeforeParse();
    }
  }
  /**
   * Called the first time parse is called to save state and allow a restore before subsequent calls to parse.
   * Not usually called directly, but available for subclasses to save their custom state.
   *
   * This is called in a lazy way. Only commands used in parsing chain will have state saved.
   */
  saveStateBeforeParse() {
    this._savedState = {
      // name is stable if supplied by author, but may be unspecified for root command and deduced during parsing
      _name: this._name,
      // option values before parse have default values (including false for negated options)
      // shallow clones
      _optionValues: { ...this._optionValues },
      _optionValueSources: { ...this._optionValueSources }
    };
  }
  /**
   * Restore state before parse for calls after the first.
   * Not usually called directly, but available for subclasses to save their custom state.
   *
   * This is called in a lazy way. Only commands used in parsing chain will have state restored.
   */
  restoreStateBeforeParse() {
    if (this._storeOptionsAsProperties)
      throw new Error(`Can not call parse again when storeOptionsAsProperties is true.
- either make a new Command for each call to parse, or stop storing options as properties`);
    this._name = this._savedState._name;
    this._scriptPath = null;
    this.rawArgs = [];
    this._optionValues = { ...this._savedState._optionValues };
    this._optionValueSources = { ...this._savedState._optionValueSources };
    this.args = [];
    this.processedArgs = [];
  }
  /**
   * Throw if expected executable is missing. Add lots of help for author.
   *
   * @param {string} executableFile
   * @param {string} executableDir
   * @param {string} subcommandName
   */
  _checkForMissingExecutable(executableFile, executableDir, subcommandName) {
    if (import_node_fs.default.existsSync(executableFile)) return;
    const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
    const executableMissing = `'${executableFile}' does not exist
 - if '${subcommandName}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
    throw new Error(executableMissing);
  }
  /**
   * Execute a sub-command executable.
   *
   * @private
   */
  _executeSubCommand(subcommand, args) {
    args = args.slice();
    const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
    function findFile(baseDir, baseName) {
      const localBin = import_node_path.default.resolve(baseDir, baseName);
      if (import_node_fs.default.existsSync(localBin)) return localBin;
      if (sourceExt.includes(import_node_path.default.extname(baseName))) return void 0;
      const foundExt = sourceExt.find(
        (ext) => import_node_fs.default.existsSync(`${localBin}${ext}`)
      );
      if (foundExt) return `${localBin}${foundExt}`;
      return void 0;
    }
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
    let executableDir = this._executableDir || "";
    if (this._scriptPath) {
      let resolvedScriptPath;
      try {
        resolvedScriptPath = import_node_fs.default.realpathSync(this._scriptPath);
      } catch {
        resolvedScriptPath = this._scriptPath;
      }
      executableDir = import_node_path.default.resolve(
        import_node_path.default.dirname(resolvedScriptPath),
        executableDir
      );
    }
    if (executableDir) {
      let localFile = findFile(executableDir, executableFile);
      if (!localFile && !subcommand._executableFile && this._scriptPath) {
        const legacyName = import_node_path.default.basename(
          this._scriptPath,
          import_node_path.default.extname(this._scriptPath)
        );
        if (legacyName !== this._name) {
          localFile = findFile(
            executableDir,
            `${legacyName}-${subcommand._name}`
          );
        }
      }
      executableFile = localFile || executableFile;
    }
    const launchWithNode = sourceExt.includes(import_node_path.default.extname(executableFile));
    let proc;
    if (import_node_process.default.platform !== "win32") {
      if (launchWithNode) {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(import_node_process.default.execArgv).concat(args);
        proc = import_node_child_process.default.spawn(import_node_process.default.argv[0], args, { stdio: "inherit" });
      } else {
        proc = import_node_child_process.default.spawn(executableFile, args, { stdio: "inherit" });
      }
    } else {
      this._checkForMissingExecutable(
        executableFile,
        executableDir,
        subcommand._name
      );
      args.unshift(executableFile);
      args = incrementNodeInspectorPort(import_node_process.default.execArgv).concat(args);
      proc = import_node_child_process.default.spawn(import_node_process.default.execPath, args, { stdio: "inherit" });
    }
    if (!proc.killed) {
      const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
      signals.forEach((signal) => {
        import_node_process.default.on(signal, () => {
          if (proc.killed === false && proc.exitCode === null) {
            proc.kill(signal);
          }
        });
      });
    }
    const exitCallback = this._exitCallback;
    proc.on("close", (code) => {
      code = code ?? 1;
      if (!exitCallback) {
        import_node_process.default.exit(code);
      } else {
        exitCallback(
          new CommanderError(
            code,
            "commander.executeSubCommandAsync",
            "(close)"
          )
        );
      }
    });
    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        this._checkForMissingExecutable(
          executableFile,
          executableDir,
          subcommand._name
        );
      } else if (err.code === "EACCES") {
        throw new Error(`'${executableFile}' not executable`);
      }
      if (!exitCallback) {
        import_node_process.default.exit(1);
      } else {
        const wrappedError = new CommanderError(
          1,
          "commander.executeSubCommandAsync",
          "(error)"
        );
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });
    this.runningCommand = proc;
  }
  /**
   * @private
   */
  _dispatchSubcommand(commandName, operands, unknown2) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({ error: true });
    subCommand._prepareForParse();
    let promiseChain;
    promiseChain = this._chainOrCallSubCommandHook(
      promiseChain,
      subCommand,
      "preSubcommand"
    );
    promiseChain = this._chainOrCall(promiseChain, () => {
      if (subCommand._executableHandler) {
        this._executeSubCommand(subCommand, operands.concat(unknown2));
      } else {
        return subCommand._parseCommand(operands, unknown2);
      }
    });
    return promiseChain;
  }
  /**
   * Invoke help directly if possible, or dispatch if necessary.
   * e.g. help foo
   *
   * @private
   */
  _dispatchHelpCommand(subcommandName) {
    if (!subcommandName) {
      this.help();
    }
    const subCommand = this._findCommand(subcommandName);
    if (subCommand && !subCommand._executableHandler) {
      subCommand.help();
    }
    return this._dispatchSubcommand(
      subcommandName,
      [],
      [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
    );
  }
  /**
   * Check this.args against expected this.registeredArguments.
   *
   * @private
   */
  _checkNumberOfArguments() {
    this.registeredArguments.forEach((arg, i) => {
      if (arg.required && this.args[i] == null) {
        this.missingArgument(arg.name());
      }
    });
    if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
      return;
    }
    if (this.args.length > this.registeredArguments.length) {
      this._excessArguments(this.args);
    }
  }
  /**
   * Process this.args using this.registeredArguments and save as this.processedArgs!
   *
   * @private
   */
  _processArguments() {
    const myParseArg = (argument, value, previous) => {
      let parsedValue = value;
      if (value !== null && argument.parseArg) {
        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
        parsedValue = this._callParseArg(
          argument,
          value,
          previous,
          invalidValueMessage
        );
      }
      return parsedValue;
    };
    this._checkNumberOfArguments();
    const processedArgs = [];
    this.registeredArguments.forEach((declaredArg, index) => {
      let value = declaredArg.defaultValue;
      if (declaredArg.variadic) {
        if (index < this.args.length) {
          value = this.args.slice(index);
          if (declaredArg.parseArg) {
            value = value.reduce((processed, v) => {
              return myParseArg(declaredArg, v, processed);
            }, declaredArg.defaultValue);
          }
        } else if (value === void 0) {
          value = [];
        }
      } else if (index < this.args.length) {
        value = this.args[index];
        if (declaredArg.parseArg) {
          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
        }
      }
      processedArgs[index] = value;
    });
    this.processedArgs = processedArgs;
  }
  /**
   * Once we have a promise we chain, but call synchronously until then.
   *
   * @param {(Promise|undefined)} promise
   * @param {Function} fn
   * @return {(Promise|undefined)}
   * @private
   */
  _chainOrCall(promise, fn) {
    if (promise?.then && typeof promise.then === "function") {
      return promise.then(() => fn());
    }
    return fn();
  }
  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */
  _chainOrCallHooks(promise, event) {
    let result = promise;
    const hooks = [];
    this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
      hookedCommand._lifeCycleHooks[event].forEach((callback) => {
        hooks.push({ hookedCommand, callback });
      });
    });
    if (event === "postAction") {
      hooks.reverse();
    }
    hooks.forEach((hookDetail) => {
      result = this._chainOrCall(result, () => {
        return hookDetail.callback(hookDetail.hookedCommand, this);
      });
    });
    return result;
  }
  /**
   *
   * @param {(Promise|undefined)} promise
   * @param {Command} subCommand
   * @param {string} event
   * @return {(Promise|undefined)}
   * @private
   */
  _chainOrCallSubCommandHook(promise, subCommand, event) {
    let result = promise;
    if (this._lifeCycleHooks[event] !== void 0) {
      this._lifeCycleHooks[event].forEach((hook) => {
        result = this._chainOrCall(result, () => {
          return hook(this, subCommand);
        });
      });
    }
    return result;
  }
  /**
   * Process arguments in context of this command.
   * Returns action result, in case it is a promise.
   *
   * @private
   */
  _parseCommand(operands, unknown2) {
    const parsed = this.parseOptions(unknown2);
    this._parseOptionsEnv();
    this._parseOptionsImplied();
    operands = operands.concat(parsed.operands);
    unknown2 = parsed.unknown;
    this.args = operands.concat(unknown2);
    if (operands && this._findCommand(operands[0])) {
      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown2);
    }
    if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
      return this._dispatchHelpCommand(operands[1]);
    }
    if (this._defaultCommandName) {
      this._outputHelpIfRequested(unknown2);
      return this._dispatchSubcommand(
        this._defaultCommandName,
        operands,
        unknown2
      );
    }
    if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
      this.help({ error: true });
    }
    this._outputHelpIfRequested(parsed.unknown);
    this._checkForMissingMandatoryOptions();
    this._checkForConflictingOptions();
    const checkForUnknownOptions = () => {
      if (parsed.unknown.length > 0) {
        this.unknownOption(parsed.unknown[0]);
      }
    };
    const commandEvent = `command:${this.name()}`;
    if (this._actionHandler) {
      checkForUnknownOptions();
      this._processArguments();
      let promiseChain;
      promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
      promiseChain = this._chainOrCall(
        promiseChain,
        () => this._actionHandler(this.processedArgs)
      );
      if (this.parent) {
        promiseChain = this._chainOrCall(promiseChain, () => {
          this.parent.emit(commandEvent, operands, unknown2);
        });
      }
      promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
      return promiseChain;
    }
    if (this.parent?.listenerCount(commandEvent)) {
      checkForUnknownOptions();
      this._processArguments();
      this.parent.emit(commandEvent, operands, unknown2);
    } else if (operands.length) {
      if (this._findCommand("*")) {
        return this._dispatchSubcommand("*", operands, unknown2);
      }
      if (this.listenerCount("command:*")) {
        this.emit("command:*", operands, unknown2);
      } else if (this.commands.length) {
        this.unknownCommand();
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    } else if (this.commands.length) {
      checkForUnknownOptions();
      this.help({ error: true });
    } else {
      checkForUnknownOptions();
      this._processArguments();
    }
  }
  /**
   * Find matching command.
   *
   * @private
   * @return {Command | undefined}
   */
  _findCommand(name) {
    if (!name) return void 0;
    return this.commands.find(
      (cmd) => cmd._name === name || cmd._aliases.includes(name)
    );
  }
  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @package
   */
  _findOption(arg) {
    return this.options.find((option) => option.is(arg));
  }
  /**
   * Display an error message if a mandatory option does not have a value.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */
  _checkForMissingMandatoryOptions() {
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd.options.forEach((anOption) => {
        if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    });
  }
  /**
   * Display an error message if conflicting options are used together in this.
   *
   * @private
   */
  _checkForConflictingLocalOptions() {
    const definedNonDefaultOptions = this.options.filter((option) => {
      const optionKey = option.attributeName();
      if (this.getOptionValue(optionKey) === void 0) {
        return false;
      }
      return this.getOptionValueSource(optionKey) !== "default";
    });
    const optionsWithConflicting = definedNonDefaultOptions.filter(
      (option) => option.conflictsWith.length > 0
    );
    optionsWithConflicting.forEach((option) => {
      const conflictingAndDefined = definedNonDefaultOptions.find(
        (defined) => option.conflictsWith.includes(defined.attributeName())
      );
      if (conflictingAndDefined) {
        this._conflictingOption(option, conflictingAndDefined);
      }
    });
  }
  /**
   * Display an error message if conflicting options are used together.
   * Called after checking for help flags in leaf subcommand.
   *
   * @private
   */
  _checkForConflictingOptions() {
    this._getCommandAndAncestors().forEach((cmd) => {
      cmd._checkForConflictingLocalOptions();
    });
  }
  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Side effects: modifies command by storing options. Does not reset state if called again.
   *
   * Examples:
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {string[]} args
   * @return {{operands: string[], unknown: string[]}}
   */
  parseOptions(args) {
    const operands = [];
    const unknown2 = [];
    let dest = operands;
    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === "-";
    }
    const negativeNumberArg = (arg) => {
      if (!/^-(\d+|\d*\.\d+)(e[+-]?\d+)?$/.test(arg)) return false;
      return !this._getCommandAndAncestors().some(
        (cmd) => cmd.options.map((opt) => opt.short).some((short) => /^-\d$/.test(short))
      );
    };
    let activeVariadicOption = null;
    let activeGroup = null;
    let i = 0;
    while (i < args.length || activeGroup) {
      const arg = activeGroup ?? args[i++];
      activeGroup = null;
      if (arg === "--") {
        if (dest === unknown2) dest.push(arg);
        dest.push(...args.slice(i));
        break;
      }
      if (activeVariadicOption && (!maybeOption(arg) || negativeNumberArg(arg))) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;
      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        if (option) {
          if (option.required) {
            const value = args[i++];
            if (value === void 0) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            if (i < args.length && (!maybeOption(args[i]) || negativeNumberArg(args[i]))) {
              value = args[i++];
            }
            this.emit(`option:${option.name()}`, value);
          } else {
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }
      if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || option.optional && this._combineFlagAndOptionalValue) {
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            this.emit(`option:${option.name()}`);
            activeGroup = `-${arg.slice(2)}`;
          }
          continue;
        }
      }
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf("=");
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }
      if (dest === operands && maybeOption(arg) && !(this.commands.length === 0 && negativeNumberArg(arg))) {
        dest = unknown2;
      }
      if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown2.length === 0) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          unknown2.push(...args.slice(i));
          break;
        } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
          operands.push(arg, ...args.slice(i));
          break;
        } else if (this._defaultCommandName) {
          unknown2.push(arg, ...args.slice(i));
          break;
        }
      }
      if (this._passThroughOptions) {
        dest.push(arg, ...args.slice(i));
        break;
      }
      dest.push(arg);
    }
    return { operands, unknown: unknown2 };
  }
  /**
   * Return an object containing local option values as key-value pairs.
   *
   * @return {object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      const result = {};
      const len = this.options.length;
      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }
    return this._optionValues;
  }
  /**
   * Return an object containing merged local and global option values as key-value pairs.
   *
   * @return {object}
   */
  optsWithGlobals() {
    return this._getCommandAndAncestors().reduce(
      (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
      {}
    );
  }
  /**
   * Display error message and exit (or call exitOverride).
   *
   * @param {string} message
   * @param {object} [errorOptions]
   * @param {string} [errorOptions.code] - an id string representing the error
   * @param {number} [errorOptions.exitCode] - used with process.exit
   */
  error(message, errorOptions) {
    this._outputConfiguration.outputError(
      `${message}
`,
      this._outputConfiguration.writeErr
    );
    if (typeof this._showHelpAfterError === "string") {
      this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
    } else if (this._showHelpAfterError) {
      this._outputConfiguration.writeErr("\n");
      this.outputHelp({ error: true });
    }
    const config = errorOptions || {};
    const exitCode = config.exitCode || 1;
    const code = config.code || "commander.error";
    this._exit(exitCode, code, message);
  }
  /**
   * Apply any option related environment variables, if option does
   * not have a value from cli or client code.
   *
   * @private
   */
  _parseOptionsEnv() {
    this.options.forEach((option) => {
      if (option.envVar && option.envVar in import_node_process.default.env) {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
          this.getOptionValueSource(optionKey)
        )) {
          if (option.required || option.optional) {
            this.emit(`optionEnv:${option.name()}`, import_node_process.default.env[option.envVar]);
          } else {
            this.emit(`optionEnv:${option.name()}`);
          }
        }
      }
    });
  }
  /**
   * Apply any implied option values, if option is undefined or default value.
   *
   * @private
   */
  _parseOptionsImplied() {
    const dualHelper = new DualOptions(this.options);
    const hasCustomOptionValue = (optionKey) => {
      return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
    };
    this.options.filter(
      (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
        this.getOptionValue(option.attributeName()),
        option
      )
    ).forEach((option) => {
      Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
        this.setOptionValueWithSource(
          impliedKey,
          option.implied[impliedKey],
          "implied"
        );
      });
    });
  }
  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @private
   */
  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this.error(message, { code: "commander.missingArgument" });
  }
  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @private
   */
  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this.error(message, { code: "commander.optionMissingArgument" });
  }
  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @private
   */
  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this.error(message, { code: "commander.missingMandatoryOptionValue" });
  }
  /**
   * `Option` conflicts with another option.
   *
   * @param {Option} option
   * @param {Option} conflictingOption
   * @private
   */
  _conflictingOption(option, conflictingOption) {
    const findBestOptionFromValue = (option2) => {
      const optionKey = option2.attributeName();
      const optionValue = this.getOptionValue(optionKey);
      const negativeOption = this.options.find(
        (target) => target.negate && optionKey === target.attributeName()
      );
      const positiveOption = this.options.find(
        (target) => !target.negate && optionKey === target.attributeName()
      );
      if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
        return negativeOption;
      }
      return positiveOption || option2;
    };
    const getErrorMessage = (option2) => {
      const bestOption = findBestOptionFromValue(option2);
      const optionKey = bestOption.attributeName();
      const source = this.getOptionValueSource(optionKey);
      if (source === "env") {
        return `environment variable '${bestOption.envVar}'`;
      }
      return `option '${bestOption.flags}'`;
    };
    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
    this.error(message, { code: "commander.conflictingOption" });
  }
  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @private
   */
  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    let suggestion = "";
    if (flag.startsWith("--") && this._showSuggestionAfterError) {
      let candidateFlags = [];
      let command = this;
      do {
        const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
        candidateFlags = candidateFlags.concat(moreFlags);
        command = command.parent;
      } while (command && !command._enablePositionalOptions);
      suggestion = suggestSimilar(flag, candidateFlags);
    }
    const message = `error: unknown option '${flag}'${suggestion}`;
    this.error(message, { code: "commander.unknownOption" });
  }
  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @private
   */
  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;
    const expected = this.registeredArguments.length;
    const s = expected === 1 ? "" : "s";
    const received = receivedArgs.length;
    const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
    const details = receivedArgs.join(", ");
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${received}: ${details}.`;
    this.error(message, { code: "commander.excessArguments" });
  }
  /**
   * Unknown command.
   *
   * @private
   */
  unknownCommand() {
    const unknownName = this.args[0];
    let suggestion = "";
    if (this._showSuggestionAfterError) {
      const candidateNames = [];
      this.createHelp().visibleCommands(this).forEach((command) => {
        candidateNames.push(command.name());
        if (command.alias()) candidateNames.push(command.alias());
      });
      suggestion = suggestSimilar(unknownName, candidateNames);
    }
    const message = `error: unknown command '${unknownName}'${suggestion}`;
    this.error(message, { code: "commander.unknownCommand" });
  }
  /**
   * Get or set the program version.
   *
   * This method auto-registers the "-V, --version" option which will print the version number.
   *
   * You can optionally supply the flags and description to override the defaults.
   *
   * @param {string} [str]
   * @param {string} [flags]
   * @param {string} [description]
   * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
   */
  version(str, flags, description) {
    if (str === void 0) return this._version;
    this._version = str;
    flags = flags || "-V, --version";
    description = description || "output the version number";
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this._registerOption(versionOption);
    this.on("option:" + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}
`);
      this._exit(0, "commander.version", str);
    });
    return this;
  }
  /**
   * Set the description.
   *
   * @param {string} [str]
   * @param {object} [argsDescription]
   * @return {(string|Command)}
   */
  description(str, argsDescription) {
    if (str === void 0 && argsDescription === void 0)
      return this._description;
    this._description = str;
    if (argsDescription) {
      this._argsDescription = argsDescription;
    }
    return this;
  }
  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  summary(str) {
    if (str === void 0) return this._summary;
    this._summary = str;
    return this;
  }
  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {(string|Command)}
   */
  alias(alias) {
    if (alias === void 0) return this._aliases[0];
    let command = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
      command = this.commands[this.commands.length - 1];
    }
    if (alias === command._name)
      throw new Error("Command alias can't be the same as its name");
    const matchingCommand = this.parent?._findCommand(alias);
    if (matchingCommand) {
      const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
      throw new Error(
        `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
      );
    }
    command._aliases.push(alias);
    return this;
  }
  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {(string[]|Command)}
   */
  aliases(aliases) {
    if (aliases === void 0) return this._aliases;
    aliases.forEach((alias) => this.alias(alias));
    return this;
  }
  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  usage(str) {
    if (str === void 0) {
      if (this._usage) return this._usage;
      const args = this.registeredArguments.map((arg) => {
        return humanReadableArgName(arg);
      });
      return [].concat(
        this.options.length || this._helpOption !== null ? "[options]" : [],
        this.commands.length ? "[command]" : [],
        this.registeredArguments.length ? args : []
      ).join(" ");
    }
    this._usage = str;
    return this;
  }
  /**
   * Get or set the name of the command.
   *
   * @param {string} [str]
   * @return {(string|Command)}
   */
  name(str) {
    if (str === void 0) return this._name;
    this._name = str;
    return this;
  }
  /**
   * Set/get the help group heading for this subcommand in parent command's help.
   *
   * @param {string} [heading]
   * @return {Command | string}
   */
  helpGroup(heading) {
    if (heading === void 0) return this._helpGroupHeading ?? "";
    this._helpGroupHeading = heading;
    return this;
  }
  /**
   * Set/get the default help group heading for subcommands added to this command.
   * (This does not override a group set directly on the subcommand using .helpGroup().)
   *
   * @example
   * program.commandsGroup('Development Commands:);
   * program.command('watch')...
   * program.command('lint')...
   * ...
   *
   * @param {string} [heading]
   * @returns {Command | string}
   */
  commandsGroup(heading) {
    if (heading === void 0) return this._defaultCommandGroup ?? "";
    this._defaultCommandGroup = heading;
    return this;
  }
  /**
   * Set/get the default help group heading for options added to this command.
   * (This does not override a group set directly on the option using .helpGroup().)
   *
   * @example
   * program
   *   .optionsGroup('Development Options:')
   *   .option('-d, --debug', 'output extra debugging')
   *   .option('-p, --profile', 'output profiling information')
   *
   * @param {string} [heading]
   * @returns {Command | string}
   */
  optionsGroup(heading) {
    if (heading === void 0) return this._defaultOptionGroup ?? "";
    this._defaultOptionGroup = heading;
    return this;
  }
  /**
   * @param {Option} option
   * @private
   */
  _initOptionGroup(option) {
    if (this._defaultOptionGroup && !option.helpGroupHeading)
      option.helpGroup(this._defaultOptionGroup);
  }
  /**
   * @param {Command} cmd
   * @private
   */
  _initCommandGroup(cmd) {
    if (this._defaultCommandGroup && !cmd.helpGroup())
      cmd.helpGroup(this._defaultCommandGroup);
  }
  /**
   * Set the name of the command from script filename, such as process.argv[1],
   * or import.meta.filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * program.nameFromFilename(import.meta.filename);
   *
   * @param {string} filename
   * @return {Command}
   */
  nameFromFilename(filename) {
    this._name = import_node_path.default.basename(filename, import_node_path.default.extname(filename));
    return this;
  }
  /**
   * Get or set the directory for searching for executable subcommands of this command.
   *
   * @example
   * program.executableDir(import.meta.dirname);
   * // or
   * program.executableDir('subcommands');
   *
   * @param {string} [path]
   * @return {(string|null|Command)}
   */
  executableDir(path2) {
    if (path2 === void 0) return this._executableDir;
    this._executableDir = path2;
    return this;
  }
  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */
  helpInformation(contextOptions) {
    const helper = this.createHelp();
    const context = this._getOutputContext(contextOptions);
    helper.prepareContext({
      error: context.error,
      helpWidth: context.helpWidth,
      outputHasColors: context.hasColors
    });
    const text = helper.formatHelp(this, helper);
    if (context.hasColors) return text;
    return this._outputConfiguration.stripColor(text);
  }
  /**
   * @typedef HelpContext
   * @type {object}
   * @property {boolean} error
   * @property {number} helpWidth
   * @property {boolean} hasColors
   * @property {function} write - includes stripColor if needed
   *
   * @returns {HelpContext}
   * @private
   */
  _getOutputContext(contextOptions) {
    contextOptions = contextOptions || {};
    const error = !!contextOptions.error;
    let baseWrite;
    let hasColors;
    let helpWidth;
    if (error) {
      baseWrite = (str) => this._outputConfiguration.writeErr(str);
      hasColors = this._outputConfiguration.getErrHasColors();
      helpWidth = this._outputConfiguration.getErrHelpWidth();
    } else {
      baseWrite = (str) => this._outputConfiguration.writeOut(str);
      hasColors = this._outputConfiguration.getOutHasColors();
      helpWidth = this._outputConfiguration.getOutHelpWidth();
    }
    const write = (str) => {
      if (!hasColors) str = this._outputConfiguration.stripColor(str);
      return baseWrite(str);
    };
    return { error, write, hasColors, helpWidth };
  }
  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */
  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === "function") {
      deprecatedCallback = contextOptions;
      contextOptions = void 0;
    }
    const outputContext = this._getOutputContext(contextOptions);
    const eventContext = {
      error: outputContext.error,
      write: outputContext.write,
      command: this
    };
    this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", eventContext));
    this.emit("beforeHelp", eventContext);
    let helpInformation = this.helpInformation({ error: outputContext.error });
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
        throw new Error("outputHelp callback must return a string or a Buffer");
      }
    }
    outputContext.write(helpInformation);
    if (this._getHelpOption()?.long) {
      this.emit(this._getHelpOption().long);
    }
    this.emit("afterHelp", eventContext);
    this._getCommandAndAncestors().forEach(
      (command) => command.emit("afterAllHelp", eventContext)
    );
  }
  /**
   * You can pass in flags and a description to customise the built-in help option.
   * Pass in false to disable the built-in help option.
   *
   * @example
   * program.helpOption('-?, --help' 'show help'); // customise
   * program.helpOption(false); // disable
   *
   * @param {(string | boolean)} flags
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */
  helpOption(flags, description) {
    if (typeof flags === "boolean") {
      if (flags) {
        if (this._helpOption === null) this._helpOption = void 0;
        if (this._defaultOptionGroup) {
          this._initOptionGroup(this._getHelpOption());
        }
      } else {
        this._helpOption = null;
      }
      return this;
    }
    this._helpOption = this.createOption(
      flags ?? "-h, --help",
      description ?? "display help for command"
    );
    if (flags || description) this._initOptionGroup(this._helpOption);
    return this;
  }
  /**
   * Lazy create help option.
   * Returns null if has been disabled with .helpOption(false).
   *
   * @returns {(Option | null)} the help option
   * @package
   */
  _getHelpOption() {
    if (this._helpOption === void 0) {
      this.helpOption(void 0, void 0);
    }
    return this._helpOption;
  }
  /**
   * Supply your own option to use for the built-in help option.
   * This is an alternative to using helpOption() to customise the flags and description etc.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addHelpOption(option) {
    this._helpOption = option;
    this._initOptionGroup(option);
    return this;
  }
  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */
  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = Number(import_node_process.default.exitCode ?? 0);
    if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
      exitCode = 1;
    }
    this._exit(exitCode, "commander.help", "(outputHelp)");
  }
  /**
   * // Do a little typing to coordinate emit and listener for the help text events.
   * @typedef HelpTextEventContext
   * @type {object}
   * @property {boolean} error
   * @property {Command} command
   * @property {function} write
   */
  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {(string | Function)} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(position, text) {
    const allowedValues = ["beforeAll", "before", "after", "afterAll"];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === "function") {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      if (helpStr) {
        context.write(`${helpStr}
`);
      }
    });
    return this;
  }
  /**
   * Output help information if help flags specified
   *
   * @param {Array} args - array of options to search for help flags
   * @private
   */
  _outputHelpIfRequested(args) {
    const helpOption = this._getHelpOption();
    const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
    if (helpRequested) {
      this.outputHelp();
      this._exit(0, "commander.helpDisplayed", "(outputHelp)");
    }
  }
};
function incrementNodeInspectorPort(args) {
  return args.map((arg) => {
    if (!arg.startsWith("--inspect")) {
      return arg;
    }
    let debugOption;
    let debugHost = "127.0.0.1";
    let debugPort = "9229";
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      debugOption = match[1];
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        debugPort = match[3];
      } else {
        debugHost = match[3];
      }
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }
    if (debugOption && debugPort !== "0") {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}
function useColor() {
  if (import_node_process.default.env.NO_COLOR || import_node_process.default.env.FORCE_COLOR === "0" || import_node_process.default.env.FORCE_COLOR === "false")
    return false;
  if (import_node_process.default.env.FORCE_COLOR || import_node_process.default.env.CLICOLOR_FORCE !== void 0)
    return true;
  return void 0;
}

// node_modules/commander/index.js
var program = new Command();

// src/collectors/scan.ts
var import_node_os3 = require("node:os");

// src/cursor/cursor-detector.ts
var import_node_child_process2 = require("node:child_process");
var import_node_fs2 = require("node:fs");
var import_node_os = require("node:os");
var import_node_path2 = require("node:path");
var import_node_util3 = require("node:util");
var execFileAsync = (0, import_node_util3.promisify)(import_node_child_process2.execFile);
var WINDOWS_CANDIDATES = [
  (0, import_node_path2.join)(process.env.LOCALAPPDATA || "", "Programs", "cursor", "Cursor.exe"),
  (0, import_node_path2.join)(process.env.LOCALAPPDATA || "", "Programs", "Cursor", "Cursor.exe"),
  (0, import_node_path2.join)(process.env.PROGRAMFILES || "", "Cursor", "Cursor.exe")
];
async function detectCursorInstall() {
  if (process.platform === "win32") {
    return detectWindows();
  }
  if (process.platform === "darwin") {
    return detectMac();
  }
  return {
    installed: false,
    version: null,
    executablePath: null,
    processRunning: false,
    processCount: 0,
    cliAgentAvailable: false,
    cliAgentPath: null,
    cliAgentVersion: null
  };
}
async function detectWindows() {
  let executablePath = null;
  for (const candidate of WINDOWS_CANDIDATES) {
    if (candidate && (0, import_node_fs2.existsSync)(candidate)) {
      executablePath = candidate;
      break;
    }
  }
  let version = null;
  if (executablePath) {
    const pkg = (0, import_node_path2.join)(
      executablePath.replace(/Cursor\.exe$/i, ""),
      "resources",
      "app",
      "package.json"
    );
    if ((0, import_node_fs2.existsSync)(pkg)) {
      try {
        const parsed = JSON.parse((0, import_node_fs2.readFileSync)(pkg, "utf8"));
        version = parsed.version ?? null;
      } catch {
        version = null;
      }
    }
  }
  const { processRunning, processCount } = await detectCursorProcess();
  const cli = await detectAgentCli();
  return {
    installed: Boolean(executablePath),
    version,
    executablePath,
    processRunning,
    processCount,
    cliAgentAvailable: cli.available,
    cliAgentPath: cli.path,
    cliAgentVersion: cli.version
  };
}
async function detectMac() {
  const candidates = [
    "/Applications/Cursor.app",
    (0, import_node_path2.join)((0, import_node_os.homedir)(), "Applications", "Cursor.app")
  ];
  const executablePath = candidates.find((p) => (0, import_node_fs2.existsSync)(p)) ?? null;
  let version = null;
  if (executablePath) {
    const pkg = (0, import_node_path2.join)(executablePath, "Contents", "Resources", "app", "package.json");
    if ((0, import_node_fs2.existsSync)(pkg)) {
      try {
        const parsed = JSON.parse((0, import_node_fs2.readFileSync)(pkg, "utf8"));
        version = parsed.version ?? null;
      } catch {
        version = null;
      }
    }
  }
  const { processRunning, processCount } = await detectCursorProcess();
  const cli = await detectAgentCli();
  return {
    installed: Boolean(executablePath),
    version,
    executablePath,
    processRunning,
    processCount,
    cliAgentAvailable: cli.available,
    cliAgentPath: cli.path,
    cliAgentVersion: cli.version
  };
}
async function detectCursorProcess() {
  try {
    if (process.platform === "win32") {
      const { stdout: stdout2 } = await execFileAsync(
        "tasklist",
        ["/FI", "IMAGENAME eq Cursor.exe", "/FO", "CSV", "/NH"],
        { windowsHide: true }
      );
      const lines2 = stdout2.split(/\r?\n/).map((l) => l.trim()).filter((l) => /Cursor\.exe/i.test(l));
      return { processRunning: lines2.length > 0, processCount: lines2.length };
    }
    const { stdout } = await execFileAsync("pgrep", ["-x", "Cursor"]);
    const lines = stdout.split(/\n/).map((l) => l.trim()).filter(Boolean);
    return { processRunning: lines.length > 0, processCount: lines.length };
  } catch {
    return { processRunning: false, processCount: 0 };
  }
}
async function detectAgentCli() {
  const candidates = [
    (0, import_node_path2.join)(process.env.LOCALAPPDATA || "", "cursor-agent", "cursor-agent.ps1"),
    (0, import_node_path2.join)((0, import_node_os.homedir)(), ".local", "bin", "agent"),
    (0, import_node_path2.join)((0, import_node_os.homedir)(), ".local", "bin", "cursor-agent"),
    (0, import_node_path2.join)((0, import_node_os.homedir)(), ".local", "bin", "cursor-agent.ps1"),
    (0, import_node_path2.join)((0, import_node_os.homedir)(), ".local", "bin", "agent.cmd")
  ];
  let path2 = null;
  for (const c of candidates) {
    if (c && (0, import_node_fs2.existsSync)(c)) {
      path2 = c;
      break;
    }
  }
  if (!path2) {
    return { available: false, path: null, version: null };
  }
  try {
    const version = await runAgentCli(path2, ["--version"]);
    return {
      available: true,
      path: path2,
      version: version.trim().split(/\r?\n/)[0] || null
    };
  } catch {
    return { available: true, path: path2, version: null };
  }
}
async function runAgentCli(scriptPath, args, opts) {
  if (scriptPath.endsWith(".ps1")) {
    const { stdout: stdout2, stderr: stderr2 } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...args],
      {
        windowsHide: true,
        timeout: opts?.timeoutMs ?? 45e3,
        env: { ...process.env, ...opts?.env },
        maxBuffer: 2 * 1024 * 1024
      }
    );
    return `${stdout2}${stderr2}`.trim();
  }
  const { stdout, stderr } = await execFileAsync(scriptPath, args, {
    windowsHide: true,
    timeout: opts?.timeoutMs ?? 45e3,
    env: { ...process.env, ...opts?.env },
    maxBuffer: 2 * 1024 * 1024
  });
  return `${stdout}${stderr}`.trim();
}

// src/cursor/local-session.ts
var import_node_os2 = require("node:os");
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");
var import_node_sqlite = require("node:sqlite");
function stateDbPath() {
  const candidates = [];
  if (process.platform === "win32" && process.env.APPDATA) {
    candidates.push(
      (0, import_node_path3.join)(process.env.APPDATA, "Cursor", "User", "globalStorage", "state.vscdb")
    );
  }
  if (process.platform === "darwin") {
    candidates.push(
      (0, import_node_path3.join)(
        (0, import_node_os2.homedir)(),
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "globalStorage",
        "state.vscdb"
      )
    );
  }
  if (process.platform === "linux") {
    candidates.push(
      (0, import_node_path3.join)((0, import_node_os2.homedir)(), ".config", "Cursor", "User", "globalStorage", "state.vscdb")
    );
  }
  return candidates.find((p) => (0, import_node_fs3.existsSync)(p)) ?? null;
}
function openDb() {
  const path2 = stateDbPath();
  if (!path2) return null;
  return new import_node_sqlite.DatabaseSync(path2, { readOnly: true });
}
function readItem(db, key) {
  try {
    const row = db.prepare("SELECT value FROM ItemTable WHERE key = ?").get(key);
    if (!row?.value) return null;
    let v = String(row.value);
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    return v || null;
  } catch {
    return null;
  }
}
function readLocalIdentity() {
  const db = openDb();
  if (!db) {
    return {
      email: null,
      membershipType: null,
      subscriptionStatus: null,
      hasAccessToken: false
    };
  }
  try {
    const token = readItem(db, "cursorAuth/accessToken");
    return {
      email: readItem(db, "cursorAuth/cachedEmail"),
      membershipType: readItem(db, "cursorAuth/stripeMembershipType"),
      subscriptionStatus: readItem(db, "cursorAuth/stripeSubscriptionStatus"),
      hasAccessToken: Boolean(token)
    };
  } finally {
    db.close();
  }
}
function readAccessTokenEphemeral() {
  const db = openDb();
  if (!db) return null;
  try {
    return readItem(db, "cursorAuth/accessToken");
  } finally {
    db.close();
  }
}

// src/cursor/dashboard-usage.ts
var DASHBOARD_BASE = "https://api2.cursor.sh/aiserver.v1.DashboardService";
function centsToUsd(cents) {
  if (typeof cents !== "number" || Number.isNaN(cents)) return null;
  return Math.round(cents) / 100;
}
function msToIso(ms) {
  const n = typeof ms === "string" ? Number(ms) : typeof ms === "number" ? ms : NaN;
  if (!Number.isFinite(n)) return null;
  return new Date(n).toISOString();
}
async function postDashboard(path2, token) {
  const res = await fetch(`${DASHBOARD_BASE}/${path2}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1"
    },
    body: "{}"
  });
  const text = await res.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: "non-json", preview: text.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, body };
}
async function fetchPlanUsageSnapshot() {
  const token = readAccessTokenEphemeral();
  if (!token) {
    return {
      available: false,
      reason: "No Cursor IDE access token found. Sign in to Cursor Desktop, then re-run scan.",
      snapshot: null
    };
  }
  try {
    const [usageRes, planRes] = await Promise.all([
      postDashboard("GetCurrentPeriodUsage", token),
      postDashboard("GetPlanInfo", token)
    ]);
    if (!usageRes.ok || !usageRes.body || typeof usageRes.body !== "object") {
      return {
        available: false,
        reason: `GetCurrentPeriodUsage failed (HTTP ${usageRes.status})`,
        snapshot: null
      };
    }
    const usage = usageRes.body;
    const planUsage = usage.planUsage || {};
    const spendLimit = usage.spendLimitUsage || {};
    const planInfo = planRes.ok && planRes.body && typeof planRes.body === "object" ? planRes.body.planInfo : void 0;
    const includedUsed = centsToUsd(planUsage.includedSpend);
    const limit = centsToUsd(planUsage.limit) ?? centsToUsd(planInfo?.includedAmountCents) ?? null;
    const remaining = centsToUsd(planUsage.remaining) ?? (includedUsed != null && limit != null ? Math.max(0, Math.round((limit - includedUsed) * 100) / 100) : null);
    const snapshot = {
      billingCycleStart: msToIso(usage.billingCycleStart),
      billingCycleEnd: msToIso(usage.billingCycleEnd),
      planName: typeof planInfo?.planName === "string" ? planInfo.planName : null,
      planPrice: typeof planInfo?.price === "string" ? planInfo.price : null,
      includedAmountCents: typeof planInfo?.includedAmountCents === "number" ? planInfo.includedAmountCents : typeof planUsage.limit === "number" ? planUsage.limit : null,
      usedUsd: centsToUsd(planUsage.totalSpend),
      includedUsedUsd: includedUsed,
      bonusUsedUsd: centsToUsd(planUsage.bonusSpend),
      limitUsd: limit,
      remainingUsd: remaining,
      totalPercentUsed: typeof planUsage.totalPercentUsed === "number" ? planUsage.totalPercentUsed : null,
      autoPercentUsed: typeof planUsage.autoPercentUsed === "number" ? planUsage.autoPercentUsed : null,
      apiPercentUsed: typeof planUsage.apiPercentUsed === "number" ? planUsage.apiPercentUsed : null,
      displayMessage: typeof usage.displayMessage === "string" ? usage.displayMessage : null,
      autoDisplayMessage: typeof usage.autoModelSelectedDisplayMessage === "string" ? usage.autoModelSelectedDisplayMessage : null,
      apiDisplayMessage: typeof usage.namedModelSelectedDisplayMessage === "string" ? usage.namedModelSelectedDisplayMessage : null,
      onDemand: {
        individualLimitUsd: centsToUsd(spendLimit.individualLimit),
        individualUsedUsd: centsToUsd(spendLimit.individualUsed),
        individualRemainingUsd: centsToUsd(spendLimit.individualRemaining),
        limitType: typeof spendLimit.limitType === "string" ? spendLimit.limitType : null
      },
      rawSafe: {
        billingCycleStart: usage.billingCycleStart,
        billingCycleEnd: usage.billingCycleEnd,
        planUsage: {
          totalSpend: planUsage.totalSpend,
          includedSpend: planUsage.includedSpend,
          bonusSpend: planUsage.bonusSpend,
          limit: planUsage.limit,
          remaining: planUsage.remaining,
          autoPercentUsed: planUsage.autoPercentUsed,
          apiPercentUsed: planUsage.apiPercentUsed,
          totalPercentUsed: planUsage.totalPercentUsed
        },
        spendLimitUsage: {
          limitType: spendLimit.limitType,
          individualLimit: spendLimit.individualLimit,
          individualUsed: spendLimit.individualUsed,
          individualRemaining: spendLimit.individualRemaining
        },
        displayMessage: usage.displayMessage,
        planInfo: planInfo ? {
          planName: planInfo.planName,
          price: planInfo.price,
          includedAmountCents: planInfo.includedAmountCents,
          billingCycleEnd: planInfo.billingCycleEnd
        } : null
      }
    };
    return {
      available: true,
      reason: "Fetched via DashboardService GetCurrentPeriodUsage + GetPlanInfo",
      snapshot
    };
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : "Usage fetch failed",
      snapshot: null
    };
  }
}

// src/security/redact.ts
var SECRET_KEY = /^(authorization|api[_-]?key|cookie|set-cookie|password|secret|token|accessToken|refreshToken|hasAccessToken|hasRefreshToken|session)$/i;
var SECRET_VALUE = /\b(crsr_[A-Za-z0-9]+|cursor_[A-Za-z0-9_-]+|Bearer\s+\S+|Basic\s+[A-Za-z0-9+/=]+)/gi;
function redactSecrets(value) {
  return walk(value);
}
function walk(value) {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.replace(SECRET_VALUE, "[REDACTED]");
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(walk);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY.test(k) ? "[REDACTED]" : walk(v);
    }
    return out;
  }
  return value;
}

// src/cursor/cursor-account.ts
async function detectAccount() {
  const local = readLocalIdentity();
  const planLive = await fetchPlanUsageSnapshot();
  const planName = planLive.snapshot?.planName || (local.membershipType ? local.membershipType.charAt(0).toUpperCase() + local.membershipType.slice(1) : null);
  if (local.email || local.hasAccessToken) {
    const fields = [
      ...local.email ? ["cachedEmail"] : [],
      ...local.membershipType ? ["stripeMembershipType"] : [],
      ...planName ? ["planName"] : []
    ];
    return {
      account: {
        status: local.email ? "AVAILABLE" : "UNKNOWN",
        authenticated: Boolean(local.email || local.hasAccessToken),
        identifier: local.email,
        plan: planName ?? "UNKNOWN",
        source: "Cursor IDE local session + DashboardService/GetPlanInfo",
        fields,
        reason: local.email ? "Signed-in Cursor IDE account detected" : "IDE token present but email not cached"
      },
      discovery: {
        source: "IDE state.vscdb (non-secret fields) + GetPlanInfo",
        available: Boolean(local.email),
        fields,
        reason: "Local IDE identity for the logged-in developer",
        rawSafeSummary: redactSecrets({
          email: local.email,
          membershipType: local.membershipType,
          subscriptionStatus: local.subscriptionStatus,
          planName,
          hasAccessToken: local.hasAccessToken
        })
      }
    };
  }
  const cli = await detectAgentCli();
  if (!cli.available || !cli.path) {
    return {
      account: {
        status: "NOT AVAILABLE",
        authenticated: false,
        identifier: null,
        plan: null,
        source: null,
        fields: [],
        reason: "Cursor IDE not signed in and Agent CLI not available"
      },
      discovery: {
        source: "IDE session / agent CLI",
        available: false,
        fields: [],
        reason: "No local identity"
      }
    };
  }
  let statusJson = null;
  let aboutJson = null;
  try {
    const raw = await runAgentCli(cli.path, ["status", "--format", "json"]);
    statusJson = safeJson(raw);
  } catch {
  }
  try {
    const raw = await runAgentCli(cli.path, ["about", "--format", "json"]);
    aboutJson = safeJson(raw);
  } catch {
  }
  const isAuthenticated = typeof statusJson?.isAuthenticated === "boolean" ? statusJson.isAuthenticated : null;
  const email = typeof aboutJson?.userEmail === "string" && aboutJson.userEmail ? aboutJson.userEmail : null;
  return {
    account: {
      status: email ? "AVAILABLE" : "NOT AVAILABLE",
      authenticated: isAuthenticated,
      identifier: email,
      plan: aboutJson?.subscriptionTier != null ? String(aboutJson.subscriptionTier) : "UNKNOWN",
      source: "official Cursor Agent CLI",
      fields: email ? ["userEmail"] : [],
      reason: email ? "CLI authenticated" : "Sign in to Cursor Desktop (or run `agent login`) to enable usage tracking"
    },
    discovery: {
      source: "agent status / about",
      available: Boolean(email),
      fields: email ? ["userEmail"] : [],
      reason: "CLI fallback"
    }
  };
}
function safeJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// src/cursor/cursor-models.ts
async function detectModels() {
  const cli = await detectAgentCli();
  if (!cli.available || !cli.path) {
    return {
      models: {
        status: "NOT AVAILABLE",
        models: [],
        source: null,
        reason: "Cursor Agent CLI not installed"
      },
      discovery: {
        source: "agent models",
        available: false,
        fields: [],
        reason: "CLI missing"
      }
    };
  }
  try {
    const raw = await runAgentCli(cli.path, ["models"]);
    const models = parseModelLines(raw);
    return {
      models: {
        status: models.length > 0 ? "AVAILABLE" : "UNKNOWN",
        models,
        source: "agent models",
        reason: models.length > 0 ? "Official CLI listed models for this environment (catalog only \u2014 not usage counts)" : "CLI returned no parseable model list"
      },
      discovery: {
        source: "agent models",
        available: models.length > 0,
        fields: models.length > 0 ? ["modelId", "displayName"] : [],
        reason: models.length > 0 ? "Model catalog available; does not include request/token usage" : "Empty model list"
      }
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "models failed";
    return {
      models: {
        status: "NOT AVAILABLE",
        models: [],
        source: "agent models",
        reason
      },
      discovery: {
        source: "agent models",
        available: false,
        fields: [],
        reason
      }
    };
  }
}
function parseModelLines(raw) {
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^Available models/i.test(trimmed)) continue;
    const id = trimmed.split(/\s+-/)[0]?.trim();
    if (id && !id.includes(" ")) out.push(id);
    else if (id) out.push(id);
  }
  return out;
}

// src/cursor/cursor-usage.ts
var unavailable = (reason) => ({
  status: "NOT AVAILABLE",
  value: null,
  source: null,
  reason
});
var available = (value, source, reason = "OK") => ({
  status: "AVAILABLE",
  value,
  source,
  reason
});
var unknown = (reason, source = null) => ({
  status: "UNKNOWN",
  value: null,
  source,
  reason
});
async function discoverUsage() {
  const discoveries = [];
  const live = await fetchPlanUsageSnapshot();
  const usageDiscovery = {
    source: "DashboardService/GetCurrentPeriodUsage + GetPlanInfo",
    available: live.available,
    fields: live.available ? [
      "usedUsd",
      "remainingUsd",
      "limitUsd",
      "totalPercentUsed",
      "billingCycleStart",
      "billingCycleEnd",
      "planName",
      "onDemand"
    ] : [],
    reason: live.reason
  };
  if (live.snapshot?.rawSafe) {
    usageDiscovery.rawSafeSummary = live.snapshot.rawSafe;
  }
  discoveries.push(usageDiscovery);
  discoveries.push({
    source: "agent usage (CLI subcommand)",
    available: false,
    fields: [],
    reason: "No top-level `agent usage` command; interactive `/usage` uses the same dashboard meters we call directly."
  });
  const cli = await detectAgentCli();
  if (cli.available && cli.path) {
    try {
      await runAgentCli(cli.path, ["about", "--format", "json"]);
      discoveries.push({
        source: "agent about --format json",
        available: true,
        fields: ["cliVersion"],
        reason: "CLI reachable (account/plan preferred from IDE session + GetPlanInfo)"
      });
    } catch (e) {
      discoveries.push({
        source: "agent about --format json",
        available: false,
        fields: [],
        reason: e instanceof Error ? e.message : "about failed"
      });
    }
  }
  if (!live.available || !live.snapshot) {
    const usage2 = {
      currentUsage: unavailable(live.reason),
      monthlyUsage: unavailable(live.reason),
      remainingUsage: unavailable(live.reason),
      usagePercentage: unavailable(live.reason),
      modelUsage: unavailable("Per-model usage breakdown not returned by GetCurrentPeriodUsage"),
      requestCounts: unavailable("Request-count buckets not returned for this plan type"),
      tokenCounts: unavailable("Account token totals not returned by this endpoint"),
      spending: unavailable(live.reason),
      billingCycle: unknown(live.reason),
      historicalUsage: unavailable("Historical events not collected in this version"),
      resetDate: unknown(live.reason),
      sources: discoveries
    };
    return { usage: usage2, discoveries };
  }
  const s = live.snapshot;
  const source = "DashboardService/GetCurrentPeriodUsage";
  const usage = {
    currentUsage: available(
      {
        usedUsd: s.usedUsd,
        includedUsedUsd: s.includedUsedUsd,
        bonusUsedUsd: s.bonusUsedUsd,
        displayMessage: s.displayMessage,
        autoDisplayMessage: s.autoDisplayMessage,
        apiDisplayMessage: s.apiDisplayMessage
      },
      source
    ),
    monthlyUsage: available(
      {
        includedUsedUsd: s.includedUsedUsd,
        limitUsd: s.limitUsd,
        billingCycleStart: s.billingCycleStart,
        billingCycleEnd: s.billingCycleEnd
      },
      source,
      "Current billing-period included usage"
    ),
    remainingUsage: available(
      {
        remainingUsd: s.remainingUsd,
        limitUsd: s.limitUsd
      },
      source
    ),
    usagePercentage: available(
      {
        totalPercentUsed: s.totalPercentUsed,
        autoPercentUsed: s.autoPercentUsed,
        apiPercentUsed: s.apiPercentUsed
      },
      source
    ),
    modelUsage: unavailable(
      "GetCurrentPeriodUsage does not include per-model request/token tables"
    ),
    requestCounts: unavailable(
      "Not provided for dollar-based Pro plans via this endpoint"
    ),
    tokenCounts: unavailable("Not provided by GetCurrentPeriodUsage"),
    spending: available(
      {
        planUsedUsd: s.usedUsd,
        includedUsedUsd: s.includedUsedUsd,
        bonusUsedUsd: s.bonusUsedUsd,
        onDemand: s.onDemand,
        planPrice: s.planPrice
      },
      source
    ),
    billingCycle: available(
      {
        start: s.billingCycleStart,
        end: s.billingCycleEnd,
        planName: s.planName
      },
      source
    ),
    historicalUsage: unavailable(
      "Not collected yet (optional GetAggregatedUsageEvents can be added later)"
    ),
    resetDate: available(
      { resetsAt: s.billingCycleEnd },
      source,
      "Billing cycle end / usage reset"
    ),
    sources: discoveries
  };
  return { usage, discoveries };
}

// src/collectors/scan.ts
var AGENT_VERSION = "0.1.0";
function getMachineInfo() {
  const osLabel = (0, import_node_os3.platform)() === "win32" ? `Windows ${(0, import_node_os3.release)()}` : `${(0, import_node_os3.type)()} ${(0, import_node_os3.release)()}`;
  return {
    os: osLabel,
    architecture: (0, import_node_os3.arch)(),
    hostname: (0, import_node_os3.hostname)()
  };
}
async function runFullScan() {
  const machine = getMachineInfo();
  const cursor = await detectCursorInstall();
  const { account, discovery: accountDiscovery } = await detectAccount();
  const { models, discovery: modelsDiscovery } = await detectModels();
  const { usage, discoveries: usageDiscoveries } = await discoverUsage();
  const usageAvailable = [
    usage.currentUsage,
    usage.remainingUsage,
    usage.usagePercentage,
    usage.monthlyUsage
  ].some((m) => m.status === "AVAILABLE");
  const report = {
    agentVersion: AGENT_VERSION,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    machine,
    cursor: {
      installed: cursor.installed,
      version: cursor.version,
      executablePath: cursor.executablePath,
      processRunning: cursor.processRunning,
      cliAgentAvailable: cursor.cliAgentAvailable
    },
    account: {
      authenticated: account.authenticated,
      identifier: account.identifier,
      plan: account.plan,
      status: account.status
    },
    usage: {
      available: usageAvailable,
      current: usage.currentUsage.value,
      remaining: usage.remainingUsage.value,
      percentage: usage.usagePercentage.value,
      monthly: usage.monthlyUsage.value,
      spending: usage.spending.value,
      billingCycle: usage.billingCycle.value,
      details: usage
    },
    models: {
      available: models.status === "AVAILABLE",
      list: models.models,
      status: models.status
    },
    spending: {
      available: usage.spending.status === "AVAILABLE",
      status: usage.spending.status
    },
    discoveries: [accountDiscovery, modelsDiscovery, ...usageDiscoveries]
  };
  return redactSecrets(report);
}
function formatHumanScan(report) {
  const u = report.usage.details;
  const current = u.currentUsage.value;
  const remaining = u.remainingUsage.value;
  const pct = u.usagePercentage.value;
  const cycle = u.billingCycle.value;
  const spend = u.spending.value;
  const lines = [
    "=====================================",
    "Cursor Usage Agent",
    "=====================================",
    "",
    "## Machine",
    "",
    `OS: ${report.machine.os}`,
    `Architecture: ${report.machine.architecture}`,
    "",
    "## Cursor",
    "",
    `Installed: ${report.cursor.installed ? "YES" : "NO"}`,
    `Version: ${report.cursor.version ?? "UNKNOWN"}`,
    `Executable: ${report.cursor.executablePath ?? "UNKNOWN"}`,
    `Process running: ${report.cursor.processRunning ? "YES" : "NO"}`,
    `Agent CLI: ${report.cursor.cliAgentAvailable ? "YES" : "NO"}`,
    "",
    "## Account",
    "",
    `Authenticated: ${report.account.authenticated === null ? "UNKNOWN" : report.account.authenticated ? "YES" : "NO"}`,
    `Account identifier: ${report.account.identifier ?? "UNKNOWN"}`,
    `Plan: ${report.account.plan ?? "UNKNOWN"}`,
    `Status: ${report.account.status}`,
    "",
    "## Usage",
    "",
    `Current usage: ${formatMoney(current?.usedUsd) ?? statusLine(u.currentUsage.status)}`,
    `Included used: ${formatMoney(current?.includedUsedUsd) ?? "UNKNOWN"}`,
    `Bonus used: ${formatMoney(current?.bonusUsedUsd) ?? "UNKNOWN"}`,
    `Monthly / period limit: ${formatMoney(remaining?.limitUsd) ?? statusLine(u.monthlyUsage.status)}`,
    `Remaining usage: ${formatMoney(remaining?.remainingUsd) ?? statusLine(u.remainingUsage.status)}`,
    `Usage percentage: ${typeof pct?.totalPercentUsed === "number" ? `${pct.totalPercentUsed.toFixed(1)}%` : statusLine(u.usagePercentage.status)}`,
    `  Auto %: ${typeof pct?.autoPercentUsed === "number" ? pct.autoPercentUsed.toFixed(1) + "%" : "UNKNOWN"}`,
    `  API %: ${typeof pct?.apiPercentUsed === "number" ? pct.apiPercentUsed.toFixed(1) + "%" : "UNKNOWN"}`,
    `Request counts: ${statusLine(u.requestCounts.status)}`,
    `Token counts: ${statusLine(u.tokenCounts.status)}`,
    `Billing cycle: ${cycle?.start && cycle?.end ? `${cycle.start} \u2192 ${cycle.end}` : statusLine(u.billingCycle.status)}`,
    `Reset date: ${u.resetDate.value?.resetsAt ?? statusLine(u.resetDate.status)}`,
    current?.displayMessage ? `Message: ${String(current.displayMessage)}` : "",
    "",
    "## Models",
    "",
    `Catalog available: ${report.models.status}`,
    `Model count: ${report.models.list.length}`,
    `Model usage metrics: ${statusLine(u.modelUsage.status)}`,
    "",
    "## Spending",
    "",
    `Plan spend (period): ${formatMoney(spend?.planUsedUsd) ?? statusLine(u.spending.status)}`,
    `Plan price: ${spend?.planPrice ?? "UNKNOWN"}`,
    `On-demand used: ${formatMoney(spend?.onDemand?.individualUsedUsd) ?? "UNKNOWN"}`,
    "",
    "## History",
    "",
    `Available: ${statusLine(u.historicalUsage.status)}`,
    "",
    "=====================================",
    "RESULT",
    "=====================================",
    "",
    `Usage meters for company dashboard: ${report.usage.available ? "AVAILABLE" : "NOT AVAILABLE"}`,
    ""
  ].filter((line) => line !== "");
  return lines.join("\n") + "\n";
}
function formatMoney(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return `$${v.toFixed(2)}`;
}
function statusLine(s) {
  return s;
}

// src/collectors/sync.ts
var import_node_fs4 = require("node:fs");
var import_node_os4 = require("node:os");
var import_node_path4 = require("node:path");
function configDir() {
  return (0, import_node_path4.join)((0, import_node_os4.homedir)(), ".cursor-usage-agent");
}
function configPath() {
  return (0, import_node_path4.join)(configDir(), "config.json");
}
function loadHubConfig() {
  const fromEnvUrl = process.env.CURSOR_USAGE_SERVER;
  const fromEnvSecret = process.env.CURSOR_USAGE_ENROLLMENT_SECRET;
  let file = {};
  if ((0, import_node_fs4.existsSync)(configPath())) {
    try {
      file = JSON.parse((0, import_node_fs4.readFileSync)(configPath(), "utf8"));
    } catch {
      file = {};
    }
  }
  const serverUrl = fromEnvUrl || file.serverUrl;
  const enrollmentSecret = fromEnvSecret || file.enrollmentSecret;
  if (!serverUrl || !enrollmentSecret) return null;
  return {
    serverUrl: serverUrl.replace(/\/$/, ""),
    enrollmentSecret,
    deviceId: file.deviceId,
    deviceToken: file.deviceToken,
    employeeId: file.employeeId,
    lastSyncAt: file.lastSyncAt
  };
}
function saveHubConfig(cfg) {
  (0, import_node_fs4.mkdirSync)(configDir(), { recursive: true });
  (0, import_node_fs4.writeFileSync)(configPath(), JSON.stringify(cfg, null, 2), "utf8");
}
function buildMinimizedPayload(report) {
  const current = report.usage.current || {};
  const remaining = report.usage.remaining || {};
  const percentage = report.usage.percentage || {};
  const billing = report.usage.billingCycle || {};
  const spending = report.usage.spending || {};
  return {
    timestamp: report.timestamp,
    agentVersion: report.agentVersion,
    cursorVersion: report.cursor.version,
    hostname: report.machine.hostname,
    os: report.machine.os,
    email: report.account.identifier,
    plan: report.account.plan,
    usage: {
      available: report.usage.available,
      usedUsd: current.usedUsd ?? null,
      includedUsedUsd: current.includedUsedUsd ?? null,
      bonusUsedUsd: current.bonusUsedUsd ?? null,
      remainingUsd: remaining.remainingUsd ?? null,
      limitUsd: remaining.limitUsd ?? null,
      totalPercentUsed: percentage.totalPercentUsed ?? null,
      autoPercentUsed: percentage.autoPercentUsed ?? null,
      apiPercentUsed: percentage.apiPercentUsed ?? null,
      displayMessage: current.displayMessage ?? null
    },
    billingCycle: {
      start: billing.start ?? null,
      end: billing.end ?? null
    },
    spending: {
      planPrice: spending.planPrice ?? null,
      planUsedUsd: spending.planUsedUsd ?? null
    }
  };
}
async function postJson(url, body, headers) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "1",
      "User-Agent": "CursorUsageAgent/0.1",
      ...headers
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Hub returned non-JSON (HTTP ${res.status}). Check the dashboard URL / ngrok. Preview: ${text.slice(0, 180)}`
    );
  }
  if (!res.ok) {
    throw new Error(String(json.error || `HTTP ${res.status}`));
  }
  return json;
}
var REGULAR_SYNC_MS = 20 * 60 * 1e3;
function markSynced(cfg) {
  saveHubConfig({
    ...cfg,
    lastSyncAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function tickHub() {
  const cfg = loadHubConfig();
  if (!cfg) {
    throw new Error(
      "Not configured. Set CURSOR_USAGE_SERVER and CURSOR_USAGE_ENROLLMENT_SECRET, then run: npm run enroll"
    );
  }
  let syncNow = false;
  if (cfg.deviceToken) {
    try {
      const hb = await postJson(`${cfg.serverUrl}/api/agents/heartbeat`, {
        agentVersion: AGENT_VERSION
      }, {
        Authorization: `Bearer ${cfg.deviceToken}`
      });
      syncNow = Boolean(hb.syncNow);
    } catch {
      syncNow = false;
    }
  }
  const last = cfg.lastSyncAt ? Date.parse(cfg.lastSyncAt) : 0;
  const due = !Number.isFinite(last) || last <= 0 || Date.now() - last >= REGULAR_SYNC_MS;
  if (!cfg.deviceToken || syncNow || due) {
    const result = await syncToHub();
    const latest = loadHubConfig();
    if (latest) markSynced(latest);
    return { action: "synced", ...result };
  }
  return { action: "idle" };
}
async function enrollWithHub(serverUrl, enrollmentSecret, report) {
  const json = await postJson(
    `${serverUrl.replace(/\/$/, "")}/api/agents/register`,
    {
      hostname: report.machine.hostname,
      os: report.machine.os,
      architecture: report.machine.architecture,
      agentVersion: report.agentVersion || AGENT_VERSION,
      cursorVersion: report.cursor.version,
      email: report.account.identifier,
      plan: report.account.plan
    },
    { "x-enrollment-secret": enrollmentSecret }
  );
  const cfg = {
    serverUrl: serverUrl.replace(/\/$/, ""),
    enrollmentSecret,
    deviceId: String(json.deviceId),
    deviceToken: String(json.deviceToken),
    employeeId: String(json.employeeId)
  };
  saveHubConfig(cfg);
  return cfg;
}
async function syncToHub() {
  const report = await runFullScan();
  let cfg = loadHubConfig();
  if (!cfg) {
    throw new Error(
      "Not configured. Set CURSOR_USAGE_SERVER and CURSOR_USAGE_ENROLLMENT_SECRET, then run: npm run sync"
    );
  }
  if (!cfg.deviceToken) {
    cfg = await enrollWithHub(cfg.serverUrl, cfg.enrollmentSecret, report);
  }
  const payload = buildMinimizedPayload(report);
  try {
    await postJson(`${cfg.serverUrl}/api/usage/report`, payload, {
      Authorization: `Bearer ${cfg.deviceToken}`
    });
    return {
      enrolled: true,
      employeeId: cfg.employeeId,
      deviceId: cfg.deviceId,
      snapshotOk: true
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unknown device") || msg.includes("401")) {
      cfg = await enrollWithHub(cfg.serverUrl, cfg.enrollmentSecret, report);
      await postJson(`${cfg.serverUrl}/api/usage/report`, payload, {
        Authorization: `Bearer ${cfg.deviceToken}`
      });
      return {
        enrolled: true,
        employeeId: cfg.employeeId,
        deviceId: cfg.deviceId,
        snapshotOk: true
      };
    }
    throw e;
  }
}

// src/main.ts
var program2 = new Command();
program2.name("cursor-agent").description(
  "Local Cursor Usage Agent POC \u2014 read-only discovery of legitimate local/CLI usage metadata"
).version(AGENT_VERSION);
program2.command("scan").description("Inspect local Cursor install/account/usage sources and print a report").action(async () => {
  const report = await runFullScan();
  console.log(formatHumanScan(report));
});
program2.command("report").description("Output a JSON report (secrets redacted)").option("-o, --out <path>", "Write JSON to file").action(async (opts) => {
  const report = await runFullScan();
  const json = JSON.stringify(report, null, 2);
  if (opts.out) {
    (0, import_node_fs5.writeFileSync)(opts.out, json, "utf8");
    console.log(`Wrote ${opts.out}`);
  } else {
    console.log(json);
  }
});
program2.command("test-usage").description(
  "Repeatedly read usage meters to assess stability (no artificial Cursor usage generated)"
).option("-n, --times <n>", "Number of reads", "3").option("-d, --delay-ms <ms>", "Delay between reads", "1500").action(async (opts) => {
  const times = Math.max(1, Number(opts.times) || 3);
  const delay = Math.max(0, Number(opts.delayMs) || 1500);
  const results = [];
  for (let i = 0; i < times; i++) {
    const { usage } = await discoverUsage();
    const pct = usage.usagePercentage.value;
    const rem = usage.remainingUsage.value;
    results.push({
      iteration: i + 1,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      currentUsage: usage.currentUsage.status,
      remainingUsage: usage.remainingUsage.status,
      totalPercentUsed: pct?.totalPercentUsed ?? null,
      remainingUsd: rem?.remainingUsd ?? null
    });
    if (i < times - 1) {
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  const percents = results.map((r) => r.totalPercentUsed).filter((v) => typeof v === "number");
  const first = percents[0];
  const stable = percents.length > 1 && first !== void 0 ? percents.every((p) => Math.abs(p - first) < 0.01) : percents.length === 1;
  console.log(
    JSON.stringify(
      {
        agentVersion: AGENT_VERSION,
        reads: results,
        analysis: {
          stable,
          changesObserved: percents.length > 1 && !stable,
          cached: "UNKNOWN",
          updatesAfterActivity: "Re-run after using Cursor to observe changes",
          hasTimestamp: true,
          billingPeriodAssociation: "AVAILABLE via billingCycle fields"
        }
      },
      null,
      2
    )
  );
});
program2.command("snapshot").description("Save latest scan JSON under .cursor-agent/snapshots (offline queue stub)").action(async () => {
  const report = await runFullScan();
  const dir = (0, import_node_path5.join)(process.cwd(), ".cursor-agent", "snapshots");
  (0, import_node_fs5.mkdirSync)(dir, { recursive: true });
  const file = (0, import_node_path5.join)(dir, `snapshot-${Date.now()}.json`);
  (0, import_node_fs5.writeFileSync)(file, JSON.stringify(report, null, 2), "utf8");
  console.log(`Saved ${file}`);
});
program2.command("enroll").description("Save company dashboard URL + enrollment secret for this PC").argument("[server]", "Company dashboard URL").argument("[secret]", "Shared enrollment secret").option("--server <url>", "Company dashboard URL").option("--secret <secret>", "Shared enrollment secret").allowExcessArguments(true).action(
  async (serverArg, secretArg, opts) => {
    const server = (opts.server || serverArg || process.env.CURSOR_USAGE_SERVER || "").replace(/\/$/, "");
    const secret = opts.secret || secretArg || process.env.CURSOR_USAGE_ENROLLMENT_SECRET || "";
    if (!server || !secret) {
      throw new Error(
        "Missing dashboard URL or enrollment secret. Re-run the installer from /install."
      );
    }
    saveHubConfig({
      serverUrl: server,
      enrollmentSecret: secret
    });
    let report;
    try {
      report = await runFullScan();
    } catch (e) {
      console.error(
        "Scan warning (still enrolling this PC):",
        e instanceof Error ? e.message : e
      );
      report = {
        agentVersion: AGENT_VERSION,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        machine: getMachineInfo(),
        cursor: {
          installed: false,
          version: null,
          executablePath: null,
          processRunning: false
        },
        account: {
          authenticated: null,
          identifier: null,
          plan: null,
          status: "UNKNOWN"
        },
        usage: { available: false },
        models: { available: false, list: [], status: "UNKNOWN" },
        spending: { available: false, status: "UNKNOWN" },
        discoveries: []
      };
    }
    try {
      const cfg = await enrollWithHub(server, secret, report);
      console.log(
        JSON.stringify(
          {
            ok: true,
            serverUrl: cfg.serverUrl,
            employeeId: cfg.employeeId,
            deviceId: cfg.deviceId
          },
          null,
          2
        )
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Enroll request failed: ${msg}`);
      process.exit(1);
    }
  }
);
program2.command("sync").description("Scan this PC and upload usage to the company dashboard").action(async () => {
  const result = await syncToHub();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
});
program2.command("tick").description("Check the hub for a sync-now request, or run a regular 20-minute sync").action(async () => {
  const result = await tickHub();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
});
program2.parseAsync(process.argv);
