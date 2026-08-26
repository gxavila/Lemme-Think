"use client";

import {
  useEffect,
  useState,
} from "react";

const SPLASH_STORAGE_KEY =
  "underground-atlas-home-splash-seen";

export default function HomeSplash() {
  const [
    visible,
    setVisible,
  ] =
    useState(false);

  const [
    exiting,
    setExiting,
  ] =
    useState(false);

  useEffect(
    () => {
      const prefersReducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

      if (
        prefersReducedMotion
      ) {
        return;
      }

      const hasSeenSplash =
        window.sessionStorage.getItem(
          SPLASH_STORAGE_KEY
        );

      if (
        hasSeenSplash
      ) {
        return;
      }

      setVisible(
        true
      );

      const exitTimer =
        window.setTimeout(
          () => {
            setExiting(
              true
            );
          },
          850
        );

      const removeTimer =
        window.setTimeout(
          () => {
            setVisible(
              false
            );

            window.sessionStorage.setItem(
              SPLASH_STORAGE_KEY,
              "true"
            );
          },
          1650
        );

      return () => {
        window.clearTimeout(
          exitTimer
        );

        window.clearTimeout(
          removeTimer
        );
      };
    },
    []
  );

  if (
    !visible
  ) {
    return null;
  }

  return (
    <div
      className={
        exiting
          ? "pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-[#f3efe4]/0 transition-colors duration-700"
          : "pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-[#f3efe4]"
      }
      aria-hidden="true"
    >
      {/* ======================================
          MOVING BRAND
      ====================================== */}

      <div
        className={
          exiting
            ? [
                "absolute",
                "left-4",
                "top-3",
                "translate-x-0",
                "translate-y-0",
                "scale-[0.18]",
                "origin-top-left",
                "opacity-0",
                "transition-all",
                "duration-700",
                "sm:left-6",
                "lg:left-8",
              ].join(
                " "
              )
            : [
                "absolute",
                "left-1/2",
                "top-1/2",
                "-translate-x-1/2",
                "-translate-y-1/2",
                "scale-100",
                "origin-center",
                "opacity-100",
              ].join(
                " "
              )
        }
        style={
          exiting
            ? {
                transitionTimingFunction:
                  "cubic-bezier(0.22, 1, 0.36, 1)",
              }
            : undefined
        }
      >
        <div className="whitespace-nowrap">
          <p className="text-center text-[clamp(3.5rem,12vw,10rem)] font-black uppercase leading-[0.78] tracking-[-0.065em]">
            Underground
            <br />
            Atlas
          </p>

          <p
            className={
              exiting
                ? "mt-6 text-center text-[10px] font-black uppercase tracking-[0.28em] text-black/50 opacity-0 transition-opacity duration-200"
                : "mt-6 text-center text-[10px] font-black uppercase tracking-[0.28em] text-black/50 opacity-100"
            }
          >
            Map the Underground
          </p>
        </div>
      </div>

      {/* ======================================
          DESTINATION MARK
      ====================================== */}

      <div
        className={
          exiting
            ? "absolute left-4 top-3 h-10 w-10 opacity-100 transition-opacity delay-500 duration-200 sm:left-6 lg:left-8"
            : "absolute left-4 top-3 h-10 w-10 opacity-0 sm:left-6 lg:left-8"
        }
      >
        <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden border-2 border-black bg-black text-white">
          <span className="-translate-x-[3px] -translate-y-[4px] text-[11px] font-black uppercase leading-none">
            U
          </span>

          <span className="absolute h-[2px] w-[28px] -rotate-45 bg-current" />

          <span className="translate-x-[4px] translate-y-[5px] text-[11px] font-black uppercase leading-none">
            A
          </span>
        </div>
      </div>
    </div>
  );
}
