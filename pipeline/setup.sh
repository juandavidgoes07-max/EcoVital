set -x
pip install --break-system-packages -q torch==2.6.0 torchaudio==2.6.0
pip install --break-system-packages -q librosa==0.11.0 s3tokenizer transformers==5.2.0 diffusers==0.29.0 "resemble-perth @ git+https://github.com/resemble-ai/Perth.git@master" conformer==0.3.2 safetensors==0.5.3 pyloudnorm omegaconf huggingface_hub faster-whisper
cd /home/claude && git clone --depth 1 https://github.com/resemble-ai/chatterbox.git cb && pip install --break-system-packages -q --no-deps -e cb
python3 - <<'PY'
from huggingface_hub import hf_hub_download as d
D="/home/claude/models/latam"
for f in ["ve.pt","conds.pt","Cangjie5_TC.json"]: d("ResembleAI/chatterbox",f,local_dir=D)
for f in ["t3_es_mx_latam.safetensors","s3gen_v3.pt","grapheme_mtl_merged_expanded_v1.json"]: d("ResembleAI/Chatterbox-Multilingual-es-mx-latam",f,local_dir=D)
from faster_whisper import WhisperModel; WhisperModel("small",device="cpu",compute_type="int8")
print("SETUP_DONE")
PY
