use super::model::{AutomationSchedule, AutomationScheduleMode};

fn normalize_weekdays(weekdays: &[String]) -> Result<Vec<String>, String> {
    if weekdays.is_empty() {
        return Ok(vec![
            "SUN".to_string(),
            "MON".to_string(),
            "TUE".to_string(),
            "WED".to_string(),
            "THU".to_string(),
            "FRI".to_string(),
            "SAT".to_string(),
        ]);
    }

    weekdays
        .iter()
        .map(|weekday| {
            let normalized = weekday.trim().to_ascii_lowercase();
            let mapped = match normalized.as_str() {
                "sun" | "sunday" => "SUN",
                "mon" | "monday" => "MON",
                "tue" | "tuesday" => "TUE",
                "wed" | "wednesday" => "WED",
                "thu" | "thursday" => "THU",
                "fri" | "friday" => "FRI",
                "sat" | "saturday" => "SAT",
                _ => return Err(format!("invalid weekday '{}'", weekday)),
            };
            Ok(mapped.to_string())
        })
        .collect::<Result<Vec<String>, String>>()
}

pub(super) fn schedule_to_cron(schedule: &AutomationSchedule) -> Result<String, String> {
    let weekdays = normalize_weekdays(&schedule.weekdays)?.join(",");

    match schedule.mode {
        AutomationScheduleMode::Daily => {
            let hour = schedule.hour.unwrap_or(9);
            let minute = schedule.minute.unwrap_or(0);
            if hour > 23 {
                return Err("daily hour must be between 0 and 23".to_string());
            }
            if minute > 59 {
                return Err("daily minute must be between 0 and 59".to_string());
            }
            Ok(format!("0 {minute} {hour} * * {weekdays}"))
        }
        AutomationScheduleMode::Interval => {
            let interval_hours = schedule.interval_hours.unwrap_or(6);
            if interval_hours == 0 || interval_hours > 24 {
                return Err("interval hours must be between 1 and 24".to_string());
            }
            Ok(format!("0 0 0/{interval_hours} * * {weekdays}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn weekdays(values: &[&str]) -> Vec<String> {
        values.iter().map(|v| (*v).to_string()).collect()
    }

    #[test]
    fn schedule_to_cron_daily_with_minute() {
        let schedule = AutomationSchedule {
            mode: AutomationScheduleMode::Daily,
            hour: Some(5),
            minute: Some(9),
            interval_hours: None,
            weekdays: weekdays(&["mon", "fri"]),
        };

        let cron = schedule_to_cron(&schedule).expect("daily schedule should be valid");
        assert_eq!(cron, "0 9 5 * * MON,FRI");
    }

    #[test]
    fn schedule_to_cron_rejects_invalid_daily_minute() {
        let schedule = AutomationSchedule {
            mode: AutomationScheduleMode::Daily,
            hour: Some(5),
            minute: Some(88),
            interval_hours: None,
            weekdays: weekdays(&["mon"]),
        };

        let err = schedule_to_cron(&schedule).expect_err("minute > 59 must be rejected");
        assert!(err.contains("daily minute must be between 0 and 59"));
    }

    #[test]
    fn schedule_to_cron_rejects_invalid_interval_hours() {
        let schedule = AutomationSchedule {
            mode: AutomationScheduleMode::Interval,
            hour: None,
            minute: None,
            interval_hours: Some(0),
            weekdays: weekdays(&["mon"]),
        };

        let err = schedule_to_cron(&schedule).expect_err("interval 0 must be rejected");
        assert!(err.contains("interval hours must be between 1 and 24"));
    }

    #[test]
    fn normalize_weekdays_defaults_to_all_days() {
        let normalized = normalize_weekdays(&[]).expect("empty weekdays should be allowed");
        assert_eq!(normalized, vec!["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
    }
}
