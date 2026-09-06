def recommended_action(risk_score: int) -> str:
    if risk_score < 30:
        return "No action needed"
    elif 30 <= risk_score <= 70:
        return "Recommend secondary verification (callback on a known number)"
    else:
        return "Block action, escalate to supervisor, do not proceed with transaction"
