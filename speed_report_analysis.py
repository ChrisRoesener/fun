import math
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


OUT_DIR = Path("C:/repos/fun/traffic_speed_analysis")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Speed-bin counts read from the "Volume by Speed" totals row (bin size = 5 mph).
speed_bins = [
    "1-5",
    "6-10",
    "11-15",
    "16-20",
    "21-25",
    "26-30",
    "31-35",
    "36-40",
    "41-45",
    "46-50",
    "51-55",
    "56-60",
    "61-65",
    "66-70",
    "71-75",
    "76-80",
    "81-85",
    "86-90",
    "91-95",
    "96-100",
    "101-150",
]

nb_counts = [154, 446, 348, 1139, 2981, 3549, 4679, 2457, 320, 29, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
sb_counts = [31, 80, 152, 147, 393, 1608, 3814, 4908, 2086, 414, 48, 7, 1, 0, 0, 0, 0, 0, 0, 0, 0]

df = pd.DataFrame(
    {
        "bin": speed_bins,
        "nb": nb_counts,
        "sb": sb_counts,
    }
)

# Bin lower/upper bounds used for threshold math.
df["lo"] = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 96, 101]
df["hi"] = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 150]
df["mid"] = (df["lo"] + df["hi"]) / 2.0


def count_over_threshold(counts_col: str, threshold: int) -> float:
    # Entire bins are above the threshold except 26-30 for threshold 30,
    # which is fully not-above. So exact with these bins.
    return float(df.loc[df["lo"] > threshold, counts_col].sum())


def denominator_filtered(counts_col: str, low_cutoff_exclusive: int) -> float:
    # Remove bins with hi <= cutoff; e.g., cutoff 10 removes 1-5 and 6-10.
    return float(df.loc[df["hi"] > low_cutoff_exclusive, counts_col].sum())


def pct(num: float, den: float) -> float:
    return 100.0 * num / den if den else math.nan


metrics = []
for direction in ("nb", "sb"):
    total = float(df[direction].sum())
    over_30 = count_over_threshold(direction, 30)
    over_35 = count_over_threshold(direction, 35)
    over_40 = count_over_threshold(direction, 40)
    over_45 = count_over_threshold(direction, 45)

    den_raw = total
    den_cut10 = denominator_filtered(direction, 10)  # excludes < 11 mph
    den_cut15 = denominator_filtered(direction, 15)  # excludes <= 15 mph
    den_cut20 = denominator_filtered(direction, 20)  # excludes <= 20 mph

    metrics.append(
        {
            "direction": direction.upper(),
            "total": total,
            "over_30_count": over_30,
            "over_35_count": over_35,
            "over_40_count": over_40,
            "over_45_count": over_45,
            "pct_over_30_raw": pct(over_30, den_raw),
            "pct_over_30_cut10": pct(over_30, den_cut10),
            "pct_over_30_cut15": pct(over_30, den_cut15),
            "pct_over_30_cut20": pct(over_30, den_cut20),
        }
    )

metrics_df = pd.DataFrame(metrics)

# Severity mix among speeders (>30)
severity = pd.DataFrame(
    {
        "Band": ["31-35", "36-40", "41-45", "46+"],
        "NB": [
            df.loc[df["bin"] == "31-35", "nb"].iloc[0],
            df.loc[df["bin"] == "36-40", "nb"].iloc[0],
            df.loc[df["bin"] == "41-45", "nb"].iloc[0],
            float(df.loc[df["lo"] >= 46, "nb"].sum()),
        ],
        "SB": [
            df.loc[df["bin"] == "31-35", "sb"].iloc[0],
            df.loc[df["bin"] == "36-40", "sb"].iloc[0],
            df.loc[df["bin"] == "41-45", "sb"].iloc[0],
            float(df.loc[df["lo"] >= 46, "sb"].sum()),
        ],
    }
)

# Hourly avg speed / hourly volume read from "Volume by Speed" table rightmost columns.
hours = list(range(24))
nb_hourly_avg = [
    28.1, 29.4, 28.9, 29.5, 28.3, 27.7, 26.5, 26.2, 25.3, 26.5, 27.9, 28.4,
    28.2, 28.4, 29.0, 29.4, 29.8, 29.7, 28.2, 28.6, 29.4, 28.7, 28.5, 29.2
]
nb_hourly_vol = [
    95, 54, 73, 64, 34, 127, 435, 485, 580, 750, 796, 896,
    1019, 1074, 1508, 1793, 1889, 1414, 991, 678, 468, 348, 355, 182
]
sb_hourly_avg = [
    32.0, 27.6, 31.1, 37.2, 35.6, 35.4, 33.8, 34.2, 35.5, 35.9, 35.8, 36.3,
    36.2, 35.6, 35.8, 36.3, 36.2, 35.8, 34.5, 34.2, 34.9, 35.2, 33.1, 33.7
]
sb_hourly_vol = [
    32, 26, 78, 112, 506, 1047, 750, 1334, 824, 855, 826, 737,
    822, 787, 761, 802, 832, 875, 611, 402, 267, 236, 114, 53
]

hourly_df = pd.DataFrame(
    {
        "hour": hours,
        "nb_avg": nb_hourly_avg,
        "nb_vol": nb_hourly_vol,
        "sb_avg": sb_hourly_avg,
        "sb_vol": sb_hourly_vol,
    }
)

# Figure 1: Speed distribution by direction
plt.figure(figsize=(11, 6))
x = range(len(df))
plt.bar([i - 0.2 for i in x], df["nb"], width=0.4, label="NB", color="#4c78a8")
plt.bar([i + 0.2 for i in x], df["sb"], width=0.4, label="SB", color="#f58518")
plt.axvline(x=5.5, linestyle="--", color="red", linewidth=1.5, label="30 mph limit boundary")
plt.xticks(list(x), df["bin"], rotation=45, ha="right")
plt.ylabel("Vehicle count")
plt.title("Speed-bin distribution (totals across 14 days)")
plt.legend()
plt.tight_layout()
plt.savefig(OUT_DIR / "speed_distribution_bins.png", dpi=180)
plt.close()

# Figure 2: Percent over threshold with low-speed filter variants
thresholds = [30, 35, 40, 45]
summary_rows = []
for direction in ("nb", "sb"):
    for thr in thresholds:
        over = count_over_threshold(direction, thr)
        den15 = denominator_filtered(direction, 15)
        summary_rows.append({"direction": direction.upper(), "threshold": thr, "pct": pct(over, den15)})
summary_df = pd.DataFrame(summary_rows)

plt.figure(figsize=(8, 5))
for d, c in [("NB", "#4c78a8"), ("SB", "#f58518")]:
    s = summary_df[summary_df["direction"] == d]
    plt.plot(s["threshold"], s["pct"], marker="o", color=c, label=d)
plt.xlabel("Threshold (mph)")
plt.ylabel("Percent above threshold (%)")
plt.title("Exceedance curve (denominator excludes <=15 mph)")
plt.xticks(thresholds)
plt.grid(alpha=0.2)
plt.legend()
plt.tight_layout()
plt.savefig(OUT_DIR / "exceedance_curve_filtered15.png", dpi=180)
plt.close()

# Figure 3: Severity mix among speeders (>30)
sev = severity.copy()
sev["NB_pct"] = 100 * sev["NB"] / sev["NB"].sum()
sev["SB_pct"] = 100 * sev["SB"] / sev["SB"].sum()

plt.figure(figsize=(8, 5))
idx = range(len(sev))
plt.bar([i - 0.2 for i in idx], sev["NB_pct"], width=0.4, label="NB", color="#4c78a8")
plt.bar([i + 0.2 for i in idx], sev["SB_pct"], width=0.4, label="SB", color="#f58518")
plt.xticks(list(idx), sev["Band"])
plt.ylabel("Share of speeders (%)")
plt.title("Where speeding sits above 30 mph")
plt.legend()
plt.tight_layout()
plt.savefig(OUT_DIR / "speeding_severity_mix.png", dpi=180)
plt.close()

# Figure 4: Hourly volume and average speed
fig, ax1 = plt.subplots(figsize=(11, 6))
ax2 = ax1.twinx()
ax1.plot(hours, nb_hourly_avg, color="#4c78a8", marker="o", label="NB avg speed")
ax1.plot(hours, sb_hourly_avg, color="#f58518", marker="o", label="SB avg speed")
ax1.axhline(30, color="red", linestyle="--", linewidth=1.2, label="30 mph limit")
ax2.bar([h - 0.2 for h in hours], nb_hourly_vol, width=0.4, alpha=0.18, color="#4c78a8", label="NB volume")
ax2.bar([h + 0.2 for h in hours], sb_hourly_vol, width=0.4, alpha=0.18, color="#f58518", label="SB volume")
ax1.set_xlabel("Hour of day")
ax1.set_ylabel("Average speed (mph)")
ax2.set_ylabel("Volume (vehicles/hour)")
ax1.set_title("Hourly speed-volume pattern")

lns1, labs1 = ax1.get_legend_handles_labels()
lns2, labs2 = ax2.get_legend_handles_labels()
ax1.legend(lns1 + lns2, labs1 + labs2, loc="upper left", fontsize=9)
plt.tight_layout()
plt.savefig(OUT_DIR / "hourly_speed_volume_pattern.png", dpi=180)
plt.close()

# Correlations for pattern notes
nb_corr = hourly_df["nb_avg"].corr(hourly_df["nb_vol"])
sb_corr = hourly_df["sb_avg"].corr(hourly_df["sb_vol"])

metrics_df.to_csv(OUT_DIR / "computed_metrics.csv", index=False)
summary_df.to_csv(OUT_DIR / "exceedance_curve_data.csv", index=False)
severity.to_csv(OUT_DIR / "severity_counts.csv", index=False)

print("WROTE:", OUT_DIR)
print("METRICS")
print(metrics_df.to_string(index=False))
print(f"NB avg-speed vs volume corr: {nb_corr:.3f}")
print(f"SB avg-speed vs volume corr: {sb_corr:.3f}")
