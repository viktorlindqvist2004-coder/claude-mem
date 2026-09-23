# Generated voice lines

Eight lines of the Night Manager, generated with the *Arthur* preset (male, 60s).
They are the proof that the pipeline works end to end, not the finished audio:
the rest of the 123-line script is in `VOICE_SCRIPT.md` and is unrecorded.

| key | speaker | line |
| --- | --- | --- |
| `n1_ask_the_time_1` | NIGHT MANAGER (Arthur) | The time? You've a clock in the atrium, same as me. Big thing. Hard to miss. |
| `n1_ask_the_time_2` | NIGHT MANAGER (Arthur) | Go on down. The fuse won't change itself. |
| `n1_ask_the_time_again_2` | NIGHT MANAGER (Arthur) | I don't have a watch on me. |
| `n1_clocked_in_1` | NIGHT MANAGER (Arthur) | Good. That's you on the payroll. |
| `n1_helpful_wet_floor_2` | NIGHT MANAGER (Arthur) | Mop it before someone slips. That's a genuine one, that. |
| `n1_name_from_stockroom_1` | NIGHT MANAGER (Arthur) | Did you hear that? I didn't hear that. |
| `n1_power_cut_1` | NIGHT MANAGER (Arthur) | Ah. That'll be the fuse on the basement board again. |
| `n1_power_cut_2` | NIGHT MANAGER (Arthur) | It's no bother — down the service stair, right at the bottom, the cupboard on your left. |

## Getting them

 ```bash
 cd night-shift/audio
 ./fetch_voice.sh
 ```

Then upload `voice/*.wav` to Roblox (Creator Dashboard → Audio → Add Audio, many at
once), and paste the ids into `VoiceBank.IDS` keyed by filename. `tools/voice_ids.py`
turns a pasted dashboard listing into that table for you.

