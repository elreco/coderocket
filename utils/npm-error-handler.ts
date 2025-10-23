export function getUserFriendlyNpmError(errorOutput: string): {
  title: string;
  message: string;
} {
  const lowerError = errorOutput.toLowerCase();

  if (
    lowerError.includes("enotfound") ||
    lowerError.includes("etimedout") ||
    lowerError.includes("econnreset") ||
    lowerError.includes("network timeout")
  ) {
    return {
      title: "Network Error",
      message:
        "Unable to reach npm registry. Please check your internet connection.",
    };
  }

  if (
    lowerError.includes("e404") ||
    lowerError.includes("404 not found") ||
    lowerError.includes("cannot find module")
  ) {
    return {
      title: "Package Not Found",
      message:
        "One or more packages could not be found. Please verify package names and versions.",
    };
  }

  if (
    lowerError.includes("eresolve") ||
    lowerError.includes("peer dep") ||
    lowerError.includes("conflicting")
  ) {
    return {
      title: "Dependency Conflict",
      message:
        "There's a conflict between package versions. The AI can help resolve this.",
    };
  }

  if (lowerError.includes("eacces") || lowerError.includes("eperm")) {
    return {
      title: "Permission Error",
      message: "Unable to write files. This might be a permission issue.",
    };
  }

  if (lowerError.includes("enospc") || lowerError.includes("no space left")) {
    return {
      title: "Disk Space Error",
      message: "Not enough disk space to install packages.",
    };
  }

  return {
    title: "Installation Error",
    message: "An error occurred during package installation.",
  };
}

export function getUserFriendlyBuildError(errorOutput: string): {
  title: string;
  message: string;
} {
  const lowerError = errorOutput.toLowerCase();

  if (
    lowerError.includes("module not found") ||
    lowerError.includes("cannot find module") ||
    lowerError.includes("could not resolve")
  ) {
    return {
      title: "Module Not Found",
      message:
        "A required module is missing. Make sure all imports are correct.",
    };
  }

  if (
    lowerError.includes("syntaxerror") ||
    lowerError.includes("unexpected token") ||
    lowerError.includes("parsing error")
  ) {
    return {
      title: "Syntax Error",
      message: "There's a syntax error in your code. The AI can help fix it.",
    };
  }

  if (
    lowerError.includes("typescript error") ||
    lowerError.includes("error ts") ||
    lowerError.includes("type error")
  ) {
    return {
      title: "TypeScript Error",
      message: "Type checking failed. Check your TypeScript types.",
    };
  }

  if (
    lowerError.includes("enoent") ||
    lowerError.includes("does the file exist")
  ) {
    return {
      title: "File Not Found",
      message: "A required file is missing. Check your file paths.",
    };
  }

  if (
    lowerError.includes("failed to compile") ||
    lowerError.includes("compilation failed")
  ) {
    return {
      title: "Compilation Failed",
      message: "The code failed to compile. Review the error details below.",
    };
  }

  if (
    lowerError.includes("missing script") ||
    lowerError.includes("script not found")
  ) {
    return {
      title: "Script Missing",
      message: 'The "dev" script might be missing from package.json.',
    };
  }

  return {
    title: "Build Error",
    message: "An error occurred during the build process.",
  };
}
