"""Voz en off gratis: Chatterbox Multilingual V3, finetune español LatAm (MIT), en CPU.
Setup (dominios permitidos: huggingface.co, *.hf.co): ver setup.sh
Uso: m=load(); w=m.generate(texto, language_id="es", audio_prompt_path="voz_juan.wav")
"""
import torch
from pathlib import Path
from safetensors.torch import load_file
from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals
from chatterbox.models.voice_encoder import VoiceEncoder
from chatterbox.models.t3 import T3
from chatterbox.models.t3.modules.t3_config import T3Config
from chatterbox.models.s3gen import S3Gen
from chatterbox.models.tokenizers import MTLTokenizer
D = Path("/home/claude/models/latam")

def load():
    torch.set_num_threads(2)
    ve = VoiceEncoder(); ve.load_state_dict(torch.load(D/"ve.pt", map_location="cpu", weights_only=True)); ve.eval()
    t3 = T3(T3Config.multilingual()); st = load_file(D/"t3_es_mx_latam.safetensors")
    if "model" in st: st = st["model"][0]
    t3.load_state_dict(st); t3.eval()
    s3 = S3Gen(); sd = torch.load(D/"s3gen_v3.pt", map_location="cpu", weights_only=True)
    s3.load_state_dict(sd, strict=False)  # v3 no trae buffers tokenizer._mel_filters/window; se usan los por defecto
    s3.eval()
    tok = MTLTokenizer(str(D/"grapheme_mtl_merged_expanded_v1.json"))
    conds = Conditionals.load(D/"conds.pt", map_location="cpu")
    return ChatterboxMultilingualTTS(t3, s3, ve, tok, "cpu", conds=conds)
