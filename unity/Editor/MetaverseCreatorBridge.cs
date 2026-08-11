#if UNITY_EDITOR

using System;
using System.Text;
using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;

namespace MetaverseCreator.Editor
{
    [Serializable]
    public sealed class BridgeConfig
    {
        public string endpoint = "http://127.0.0.1:8787/bridge/unity";
        public int timeoutSeconds = 10;
    }

    [Serializable]
    public sealed class BridgeRequest
    {
        public string protocol = "1";
        public string requestId;
        public string action;
        public string sceneId;
    }

    [Serializable]
    public sealed class BridgeError
    {
        public string code;
        public string message;
    }

    [Serializable]
    public sealed class BridgeResponse
    {
        public string protocol;
        public string requestId;
        public bool ok;
        public string result;
        public BridgeError error;
    }

    public sealed class MetaverseCreatorBridgeWindow : EditorWindow
    {
        private BridgeConfig config = new BridgeConfig();
        private string status = "Disconnected";

        [MenuItem("Metaverse Creator/Bridge")]
        private static void Open()
        {
            GetWindow<MetaverseCreatorBridgeWindow>("Metaverse Creator");
        }

        private void OnGUI()
        {
            EditorGUILayout.LabelField("Unity Bridge", EditorStyles.boldLabel);
            config.endpoint = EditorGUILayout.TextField("Endpoint", config.endpoint);
            config.timeoutSeconds = EditorGUILayout.IntField("Timeout (seconds)", config.timeoutSeconds);

            EditorGUILayout.Space();
            EditorGUILayout.LabelField("Status", status);

            using (new EditorGUI.DisabledScope(!Application.isEditor))
            {
                if (GUILayout.Button("Get Active Scene"))
                {
                    RequestActiveScene();
                }
            }
        }

        private void RequestActiveScene()
        {
            var scene = UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene();
            if (string.IsNullOrEmpty(scene.path))
            {
                status = "The active scene has not been saved.";
                Repaint();
                return;
            }

            var request = new BridgeRequest
            {
                requestId = Guid.NewGuid().ToString("N"),
                action = "get-active-scene",
                sceneId = scene.name,
            };

            var json = JsonUtility.ToJson(request);
            var operation = new UnityWebRequest(config.endpoint, UnityWebRequest.kHttpVerbPOST)
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json)),
                downloadHandler = new DownloadHandlerBuffer(),
                timeout = Mathf.Max(1, config.timeoutSeconds),
            };
            operation.SetRequestHeader("Content-Type", "application/json");

            status = "Requesting...";
            Repaint();
            operation.SendWebRequest().completed += _ => HandleResponse(operation);
        }

        private void HandleResponse(UnityWebRequest request)
        {
            if (request.result != UnityWebRequest.Result.Success)
            {
                status = $"HTTP error: {request.error}";
                request.Dispose();
                Repaint();
                return;
            }

            var response = JsonUtility.FromJson<BridgeResponse>(request.downloadHandler.text);
            status = response != null && response.ok
                ? "Connected: scene received"
                : $"Bridge error: {response?.error?.message ?? "Invalid response"}";

            request.Dispose();
            Repaint();
        }
    }
}

#endif
