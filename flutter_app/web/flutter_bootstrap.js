{{flutter_js}}
{{flutter_build_config}}

(function () {
  const buildVersion = "{{flutter_service_worker_version}}";

  if (window._flutter?.buildConfig?.builds) {
    window._flutter.buildConfig.builds = window._flutter.buildConfig.builds.map(
      (build) => {
        const mainJsPath = build.mainJsPath || "main.dart.js";
        return {
          ...build,
          mainJsPath: mainJsPath.includes("?v=")
              ? mainJsPath
              : `${mainJsPath}?v=${buildVersion}`,
        };
      },
    );
  }

  _flutter.loader.load({
    serviceWorkerSettings: null,
  });
}());
